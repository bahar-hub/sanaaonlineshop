(function () {
    "use strict";

    const adminPage = document.getElementById("adminPage");

    if (!adminPage) {
        return;
    }


    /*
     * --------------------------------------------------
     * Admin page routes
     * --------------------------------------------------
     */

    const ADMIN_ROUTES = {
        orders: "admin-orders-f.html",
        customers: "admin-customers-f.html",
        reports: "admin-reports-f.html"
    };


    /*
     * --------------------------------------------------
     * Navigation
     * --------------------------------------------------
     */

    const navItems = document.querySelectorAll(
        "[data-admin-nav-f]"
    );


    function navigateTo(section) {

        const target = ADMIN_ROUTES[section];

        if (!target) {
            return;
        }

        window.location.href = target;
    }


    navItems.forEach(function (item) {

        item.addEventListener("click", function () {

            const section = item.dataset.adminNavF;

            navigateTo(section);

        });

    });


    /*
     * --------------------------------------------------
     * Logout
     * --------------------------------------------------
     */

    const logoutButton = adminPage.querySelector(
        "[data-logout]"
    );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                /*
                 * IMPORTANT:
                 * Do not clear all localStorage data.
                 * Only remove the authentication key when
                 * it exists.
                 */

                const possibleAuthKeys = [
                    "currentUser",
                    "loggedInUser",
                    "authUser",
                    "user"
                ];


                possibleAuthKeys.forEach(function (key) {

                    localStorage.removeItem(key);

                });


                sessionStorage.clear();

                window.location.href = "index.html";

            }
        );

    }


    /*
     * --------------------------------------------------
     * Initial admin state
     * --------------------------------------------------
     */

    adminPage.hidden = false;


    
})();