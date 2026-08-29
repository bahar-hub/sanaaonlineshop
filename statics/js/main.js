document.addEventListener("DOMContentLoaded", () => {

    initAuth();

    initSplash();

    initAuthTabs();

    initPasswordToggle();

    initForms();

    initLogout();

    if (typeof initCustomerPanel === "function") {
        initCustomerPanel();
    }


});


// ========================================
// Splash
// ========================================

function initSplash() {
    const splash = document.getElementById("splash");
    const authPage = document.getElementById("authPage");

    if (!splash) {
        return;
    }

    const SPLASH_DURATION = 2200;

    setTimeout(() => {

        splash.classList.add("is-hidden");

        requestAnimationFrame(() => {

            if (authPage) {
                authPage.hidden = false;
                authPage.classList.add("is-visible");
            }

        });

        setTimeout(() => {
            splash.remove();
        }, 800);

    }, SPLASH_DURATION);
}


// ========================================
// Authentication Tabs
// ========================================

function initAuthTabs() {
    const tabs = document.querySelectorAll("[data-auth-tab]");
    const forms = document.querySelectorAll("[data-auth-form]");
    const switchButtons = document.querySelectorAll("[data-switch-auth]");

    if (!tabs.length || !forms.length) {
        return;
    }

    function switchAuth(type) {

        tabs.forEach((tab) => {
            const isActive = tab.dataset.authTab === type;

            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive);
        });

        forms.forEach((form) => {
            const isActive = form.dataset.authForm === type;

            form.classList.toggle("is-active", isActive);
        });
    }


    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            switchAuth(tab.dataset.authTab);
        });
    });


    switchButtons.forEach((button) => {
        button.addEventListener("click", () => {
            switchAuth(button.dataset.switchAuth);
        });
    });
}


// ========================================
// Password Toggle
// ========================================

function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll(
        "[data-password-toggle]"
    );

    toggleButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const inputId = button.dataset.passwordToggle;
            const input = document.getElementById(inputId);

            if (!input) {
                return;
            }

            const isPassword = input.type === "password";

            input.type = isPassword
                ? "text"
                : "password";

            button.classList.toggle("is-visible", isPassword);

            button.setAttribute(
                "aria-label",
                isPassword
                    ? "مخفی کردن رمز عبور"
                    : "نمایش رمز عبور"
            );
        });

    });
}


// ========================================
// Forms
// ========================================

// ========================================
// Forms
// ========================================

function initForms() {

    const loginForm =
        document.getElementById("loginForm");

    const signupForm =
        document.getElementById("signupForm");


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            handleSignup
        );

    }
}


// ========================================
// Login Handler
// ========================================

function handleLogin(event) {

    event.preventDefault();


    const form = event.currentTarget;
    clearAuthError("loginForm");


    if (!form.checkValidity()) {

        form.reportValidity();

        return;
    }


    const formData =
        new FormData(form);


    const username =
        formData.get("username");

    const password =
        formData.get("password");


    const result =
        login(
            username,
            password
        );


    if (!result.success) {

        showAuthError(
            "نام کاربری یا رمز عبور اشتباه است.",
            "loginForm"
        );

        return;
    }


    // console.log(
    //     "Authenticated user:",
    //     result.user
    // );
    redirectToRoleHome(result.user);

}


// ========================================
// Signup Handler
// ========================================

function handleSignup(event) {

    event.preventDefault();


    const form = event.currentTarget;


    clearAuthError("signupForm");


    if (!form.checkValidity()) {

        form.reportValidity();

        return;
    }


    const formData =
        new FormData(form);


    const password =
        formData.get("password");

    // const passwordConfirm =
    //     formData.get("passwordConfirm");


    // if (password !== passwordConfirm) {

    //     showAuthError(
    //         "رمز عبور و تکرار رمز عبور یکسان نیستند.",
    //         "signupForm"
    //     );

    //     return;
    // }


    const userData = {

        firstName:
            formData.get("firstName"),

        lastName:
            formData.get("lastName"),

        phone:
            formData.get("phone"),

        address:
            formData.get("address"),

        username:
            formData.get("username"),

        password:
            password

    };


    const result =
        signup(userData);


    if (!result.success) {

        handleSignupError(
            result.error
        );

        return;
    }


    // فقط در صورت موفقیت

    form.reset();

    redirectToRoleHome(
        result.user
    );
}


// ========================================
// Signup Errors
// ========================================

function handleSignupError(errorCode) {

    const messages = {

        USERNAME_EXISTS:
            "این نام کاربری قبلاً استفاده شده است.",

        PHONE_EXISTS:
            "این شماره تلفن قبلاً ثبت شده است."

    };


    showAuthError(
        messages[errorCode] ||
        "ثبت نام انجام نشد.",
        "signupForm"
    );

}


// ========================================
// Auth Error
// ========================================

function showAuthError(message, formId) {

    const form =
        document.getElementById(formId);


    if (!form) {
        return;
    }


    let error =
        form.querySelector(".auth-error");


    if (!error) {

        error =
            document.createElement("p");

        error.className =
            "auth-error";

        form.prepend(error);
    }


    error.textContent = message;

    error.hidden = false;
}

function clearAuthError(formId) {

    const form =
        document.getElementById(formId);


    if (!form) {
        return;
    }


    const error =
        form.querySelector(".auth-error");


    if (error) {

        error.textContent = "";

        error.hidden = true;
    }
}

// ========================================
// handle logout
// ========================================

function initLogout() {

    const logoutButtons =
        document.querySelectorAll(
            "[data-logout]"
        );


    logoutButtons.forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                logout();

                window.location.href = "index.html";

            }
        );

    });
}