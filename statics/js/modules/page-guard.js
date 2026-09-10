// ========================================
// Sanaa Page Guards
// ========================================
//
// Real page-to-page navigation for the storefront (index.html /
// customer.html) — replaces the old hash-based router for these
// pages. Each page opts into the guard it needs with a one-line
// call in its own inline <script> tag; nothing here runs unless
// a page asks for it.
//
// The embedded admin panel inside index.html and its own
// router.js-based hash routing are untouched — out of scope here.


function redirectToRoleHome(user) {

    if (user.role === "admin") {

        window.location.href = "{% url 'base:admin_orders' %}";

        return;
    }


    if (user.role === "customer") {

        window.location.href = "{% url 'base:customer' %}";

        return;
    }


    // Unknown role — treat as signed out.
    logout();

    window.location.href = "index.html";
}


// Call on index.html: an already-authenticated visitor skips the
// login/signup forms and goes straight to their panel.
function redirectIfAuthenticated() {

    if (!isAuthenticated()) {
        return;
    }


    const user = getCurrentUser();

    if (!user) {
        return;
    }


    redirectToRoleHome(user);
}


// Call on customer.html: a signed-out visitor is bounced back to
// the login page before anything else on the page runs.
function requireCustomerAuth() {

    if (
        isAuthenticated() &&
        getCurrentUser()
    ) {
        return;
    }


    window.location.href = "index.html";
}
