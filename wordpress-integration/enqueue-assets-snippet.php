<?php
/**
 * Loads the Outreach checkout page's CSS/JS from wp-content/uploads/outreach/
 * Paste into a new Code Snippets PHP snippet (without the <?php line),
 * set to run everywhere, activate.
 */

if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
    $base = content_url('/uploads/outreach');

    wp_enqueue_style(
        'outreach-fonts',
        'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Onest:wght@400;500;600;700&display=swap',
        [],
        null
    );
    wp_enqueue_style('outreach-styles', "{$base}/styles.css", ['outreach-fonts'], '1.0');
    wp_enqueue_style('outreach-checkout-styles', "{$base}/checkout.css", ['outreach-styles'], '1.0');

    wp_enqueue_script('outreach-script', "{$base}/script.js", [], '1.0', true);
    wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);
    wp_enqueue_script('outreach-checkout-script', "{$base}/checkout.js", ['stripe-js'], '1.0', true);
});
