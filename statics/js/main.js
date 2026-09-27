document.addEventListener("DOMContentLoaded", () => {

    initAuth();

    initSplash();

    initHero();

    initAuthTabs();

    initPasswordToggle();

    initForms();


    if (typeof initCustomerPanel === "function") {
        initCustomerPanel();
    }


});


// ========================================
// Hero
// ========================================

function initHero() {

    const hero = document.getElementById("hero");
    const cta = document.getElementById("heroCta");
    const authPage = document.getElementById("authPage");

    if (!cta) {
        return;
    }

    cta.addEventListener("click", () => {

        if (hero) {
            hero.hidden = true;
        }

        if (authPage) {
            authPage.hidden = false;

            requestAnimationFrame(() => {
                authPage.classList.add("is-visible");
            });
        }

    });
}


// ========================================
// Splash
// ========================================

function initSplash() {

    const splash = document.getElementById("splash");
    const hero = document.getElementById("hero");
    const authPage = document.getElementById("authPage");

    // اگر Django فرم لاگین را به خاطر خطا باز کرده
    if (authPage && !authPage.hidden) {

        if (splash) {
            splash.remove();
        }

        if (hero) {
            hero.hidden = true;
        }

        requestAnimationFrame(() => {
            authPage.classList.add("is-visible");
        });

        return;
    }


    if (!splash) {
        return;
    }


    const SPLASH_DURATION = 2200;


    setTimeout(() => {

        splash.classList.add("is-hidden");


        requestAnimationFrame(() => {

            if (hero) {
                hero.hidden = false;
                hero.classList.add("is-visible");
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

async function handleLogin(event) {

    event.preventDefault();

    const form = event.currentTarget;

    clearAuthError("loginForm");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);

    try {

        const response = await fetch(form.action, {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            showAuthError(
                data.message || "نام کاربری یا رمز عبور اشتباه است.",
                "loginForm"
            );

            return;
        }

        window.location.href = data.redirect_url;

    } catch (error) {

        showAuthError(
            "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
            "loginForm"
        );

    }
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

    const formData = new FormData(form);

    const password = formData.get("password");
    const passwordConfirm = formData.get("passwordConfirm");

    // بررسی یکسان بودن رمزها
    if (password !== passwordConfirm) {

        showAuthError(
            "رمز عبور و تکرار رمز عبور یکسان نیستند.",
            "signupForm"
        );

        return;
    }

    // ارسال فرم واقعی به Django
    form.submit();
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