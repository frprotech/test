<?php
/**
 * Loads checkout.js for the Outreach cart+payment module.
 *
 * The CSS (checkout-module-scoped.css, fonts included via @import) goes in
 * WordPress: Appearance > Customize > Additional CSS instead - no file
 * upload needed for that part. This snippet only handles the JS, which
 * can't go in a CSS field.
 *
 * SETUP:
 * 1. Upload just checkout.js to wp-content/uploads/outreach/ (via cPanel
 *    File Manager or FTP).
 * 2. Paste this file into a new Code Snippets PHP snippet (WITHOUT the
 *    <?php line - the plugin adds that automatically), set to run
 *    everywhere, activate.
 * 3. Paste checkout-module-scoped.css's contents into Appearance >
 *    Customize > Additional CSS.
 * 4. Paste checkout-module-only.html's contents into an HTML widget on
 *    whichever Elementor page you want the cart to appear on.
 */

if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
    $base = content_url('/uploads/outreach');

    wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);
    wp_enqueue_script('outreach-checkout-script', "{$base}/checkout.js", ['stripe-js'], '1.0', true);
});
