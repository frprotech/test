<?php
/**
 * Loads CSS/JS for the Outreach cart+payment module only (no header/footer/
 * hero assets needed - this module uses inline icons, no images).
 *
 * This uses checkout-module-scoped.css - a version of the styling that is
 * nested under .outreach-checkout-module, so it cannot leak out and affect
 * fonts/box-sizing/etc. on the rest of an existing site's page.
 *
 * SETUP:
 * 1. Upload just these 2 files to wp-content/uploads/outreach/ (via cPanel
 *    File Manager or FTP): checkout-module-scoped.css, checkout.js
 * 2. Paste this file into a new Code Snippets PHP snippet (WITHOUT the
 *    <?php line - the plugin adds that automatically), set to run
 *    everywhere, activate.
 * 3. Paste checkout-module-only.html's contents into an HTML widget on
 *    whichever Elementor page you want the cart to appear on.
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
    wp_enqueue_style('outreach-checkout-styles', "{$base}/checkout-module-scoped.css", ['outreach-fonts'], '1.0');

    wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', [], null, true);
    wp_enqueue_script('outreach-checkout-script', "{$base}/checkout.js", ['stripe-js'], '1.0', true);
});
