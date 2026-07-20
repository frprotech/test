<?php
/**
 * Outreach - Stripe subscription checkout endpoint for WordPress.
 *
 * SETUP:
 * 1. Install a code snippets plugin (e.g. "Code Snippets" or "WPCode") if you
 *    don't already have one, from Plugins > Add New in wp-admin.
 * 2. Create a new PHP snippet, paste this entire file's contents in, set it
 *    to run everywhere, and activate it.
 * 3. Replace OUTREACH_STRIPE_SECRET_KEY below with your real Stripe secret
 *    key (starts with sk_test_ while testing, sk_live_ when you go live).
 *    This value never leaves your server - it is not sent to the browser.
 * 4. In checkout.js, set STRIPE_PUBLISHABLE_KEY to your Stripe publishable
 *    key (starts with pk_) and WP_API_BASE to your site's REST base
 *    (e.g. 'https://yoursite.com/wp-json/outreach/v1').
 * 5. Test with Stripe's test card 4242 4242 4242 4242, any future expiry,
 *    any CVC, any ZIP - see https://stripe.com/docs/testing for more.
 *
 * This does NOT use the Stripe PHP SDK (to avoid needing Composer inside a
 * code-snippets plugin) - it talks to the Stripe API directly over HTTPS
 * using WordPress's built-in HTTP client.
 */

if (!defined('ABSPATH')) exit;

// ---------------------------------------------------------------------------
// 1) Your Stripe SECRET key. Keep this here, on the server, only.
// ---------------------------------------------------------------------------
define('OUTREACH_STRIPE_SECRET_KEY', 'sk_test_REPLACE_ME');

// ---------------------------------------------------------------------------
// 2) Server-side source of truth for pricing. This MUST mirror checkout.js's
//    pricing rules exactly - the browser's totals are for display only, this
//    is what actually gets charged.
// ---------------------------------------------------------------------------
function outreach_calculate_line_items($selected_plans) {
    $selected = array_flip($selected_plans);

    if (isset($selected['bundle'])) {
        return [
            ['label' => 'Bundle For All Four Services', 'amount' => 38000],
        ];
    }

    $email_selected = isset($selected['email']);
    $items = [];

    if ($email_selected) {
        $items[] = ['label' => 'Email Marketing Plan', 'amount' => 19500];
    }

    $addon_prices = [
        'social' => ['with' => 4500, 'without' => 9500, 'label' => 'Social Media Plan'],
        'review' => ['with' => 4500, 'without' => 9500, 'label' => 'Review Plan'],
        'blog'   => ['with' => 9500, 'without' => 19500, 'label' => 'Blogging Plan'],
    ];

    foreach ($addon_prices as $key => $cfg) {
        if (isset($selected[$key])) {
            $amount = $email_selected ? $cfg['with'] : $cfg['without'];
            $items[] = ['label' => $cfg['label'], 'amount' => $amount];
        }
    }

    return $items;
}

// ---------------------------------------------------------------------------
// 3) Minimal Stripe API client using wp_remote_post - no SDK/Composer needed.
// ---------------------------------------------------------------------------
function outreach_stripe_request($endpoint, $params) {
    $response = wp_remote_post("https://api.stripe.com/v1/{$endpoint}", [
        'headers' => [
            'Authorization' => 'Bearer ' . OUTREACH_STRIPE_SECRET_KEY,
        ],
        'body' => $params,
        'timeout' => 20,
    ]);

    if (is_wp_error($response)) {
        throw new Exception($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($code >= 400) {
        $message = isset($body['error']['message']) ? $body['error']['message'] : 'Stripe API error.';
        throw new Exception($message);
    }

    return $body;
}

// ---------------------------------------------------------------------------
// 4) REST route: POST /wp-json/outreach/v1/create-subscription
//    Body: { "plans": ["email","social"], "email": "...", "name": "..." }
//    Returns: { "subscriptionId": "...", "clientSecret": "..." }
// ---------------------------------------------------------------------------
add_action('rest_api_init', function () {
    register_rest_route('outreach/v1', '/create-subscription', [
        'methods' => 'POST',
        'callback' => 'outreach_create_subscription',
        'permission_callback' => '__return_true',
    ]);
});

// Stripe's Subscription API needs an existing Product ID for each price
// (unlike Checkout Sessions, it does not accept inline product_data). This
// creates each plan's product once and reuses it on every later request.
function outreach_get_or_create_product($label) {
    $option_key = 'outreach_stripe_product_' . md5($label);
    $product_id = get_option($option_key);
    if ($product_id) {
        return $product_id;
    }

    $product = outreach_stripe_request('products', ['name' => $label]);
    update_option($option_key, $product['id']);
    return $product['id'];
}

function outreach_create_subscription(WP_REST_Request $request) {
    $body = $request->get_json_params();
    $plans = isset($body['plans']) && is_array($body['plans']) ? array_map('sanitize_text_field', $body['plans']) : [];
    $email = isset($body['email']) ? sanitize_email($body['email']) : '';
    $name  = isset($body['name']) ? sanitize_text_field($body['name']) : '';

    if (empty($plans) || empty($email) || !is_email($email)) {
        return new WP_REST_Response(['message' => 'Missing or invalid plans/email.'], 400);
    }

    $line_items = outreach_calculate_line_items($plans);
    if (empty($line_items)) {
        return new WP_REST_Response(['message' => 'No valid plans selected.'], 400);
    }

    try {
        // Create (or reuse) the Stripe customer.
        $customer = outreach_stripe_request('customers', [
            'email' => $email,
            'name' => $name,
        ]);

        // Build subscription line items with inline recurring prices.
        $sub_params = [
            'customer' => $customer['id'],
            'payment_behavior' => 'default_incomplete',
            'payment_settings' => [
                'save_default_payment_method' => 'on_subscription',
            ],
            'expand' => ['latest_invoice.payment_intent'],
        ];

        foreach ($line_items as $i => $item) {
            $sub_params['items'][$i]['price_data']['currency'] = 'usd';
            $sub_params['items'][$i]['price_data']['unit_amount'] = $item['amount'];
            $sub_params['items'][$i]['price_data']['recurring']['interval'] = 'month';
            $sub_params['items'][$i]['price_data']['product'] = outreach_get_or_create_product($item['label']);
        }

        $subscription = outreach_stripe_request('subscriptions', $sub_params);

        $client_secret = $subscription['latest_invoice']['payment_intent']['client_secret'] ?? null;
        if (!$client_secret) {
            return new WP_REST_Response(['message' => 'Could not start payment - please try again.'], 500);
        }

        return new WP_REST_Response([
            'subscriptionId' => $subscription['id'],
            'clientSecret' => $client_secret,
        ], 200);
    } catch (Exception $e) {
        return new WP_REST_Response(['message' => $e->getMessage()], 500);
    }
}
