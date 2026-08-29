// ========================================
// Sanaa Forgot Password (OTP demo flow)
// ========================================
//
// There is no SMS gateway or backend in this frontend-only
// project, so the "code" is generated locally and shown in the
// hint text below the input. Swap generateOtpCode()/handleSendCode()
// for a real API call once a backend exists.

(function () {
    "use strict";

    let pendingReset = null; // { phone, code, user }


    // ========================================
    // Helpers
    // ========================================

    function findUserByPhone(phone) {

        const users = getUsers();

        return users.find((user) => {
            return user.phone === phone;
        }) || null;
    }


    function generateOtpCode() {

        return String(
            Math.floor(1000 + Math.random() * 9000)
        );
    }


    function showStep(step) {

        document
            .querySelectorAll("[data-forgot-step]")
            .forEach((el) => {

                const isMatch =
                    el.dataset.forgotStep === step;

                el.classList.toggle("is-active", isMatch);

                // Belt-and-suspenders: the native hidden attribute
                // keeps the inactive step out of view even if the
                // stylesheet serving this page is out of date.
                el.hidden = !isMatch;
            });
    }


    // ========================================
    // Step 1 — Send Code
    // ========================================

    function handleSendCode() {

        clearAuthError("forgotForm");

        const phoneInput =
            document.getElementById("forgotPhone");

        const phone = phoneInput.value.trim();

        const phonePattern = /^09\d{9}$/;

        if (!phonePattern.test(phone)) {

            showAuthError(
                "شماره تلفن معتبر نیست.",
                "forgotForm"
            );

            return;
        }

        const user = findUserByPhone(phone);

        if (!user) {

            showAuthError(
                "کاربری با این شماره تلفن یافت نشد.",
                "forgotForm"
            );

            return;
        }

        const code = generateOtpCode();

        pendingReset = { phone, code, user };

        const hint =
            document.getElementById("forgotHint");

        if (hint) {

            hint.textContent =
                `کد تایید برای شماره ${phone} پیامک شد. ` +
                `(کد آزمایشی این نسخه: ${code})`;
        }

        const codeInput =
            document.getElementById("forgotCode");

        if (codeInput) {
            codeInput.value = "";
        }

        showStep("code");
    }


    // ========================================
    // Step 2 — Resend Code
    // ========================================

    function handleResendCode() {

        clearAuthError("forgotForm");

        if (!pendingReset) {

            showStep("phone");

            return;
        }

        const code = generateOtpCode();

        pendingReset.code = code;

        const hint =
            document.getElementById("forgotHint");

        if (hint) {

            hint.textContent =
                `کد تایید مجدد برای شماره ${pendingReset.phone} پیامک شد. ` +
                `(کد آزمایشی این نسخه: ${code})`;
        }
    }


    // ========================================
    // Step 2 — Verify Code
    // ========================================

    function handleVerifyCode(event) {

        event.preventDefault();

        clearAuthError("forgotForm");

        if (!pendingReset) {

            showStep("phone");

            return;
        }

        const codeInput =
            document.getElementById("forgotCode");

        const enteredCode = codeInput.value.trim();

        if (enteredCode !== pendingReset.code) {

            showAuthError(
                "کد وارد شده صحیح نیست.",
                "forgotForm"
            );

            return;
        }

        const currentUser =
            sanitizeUser(pendingReset.user);

        saveCurrentUser(currentUser);

        pendingReset = null;

        redirectToRoleHome(currentUser);
    }


    // ========================================
    // Reset Flow
    // ========================================

    function resetForgotForm() {

        pendingReset = null;

        const form =
            document.getElementById("forgotForm");

        if (form) {
            form.reset();
        }

        clearAuthError("forgotForm");

        showStep("phone");
    }


    // ========================================
    // Init
    // ========================================

    function initForgotPassword() {

        const form =
            document.getElementById("forgotForm");

        if (!form) {
            return;
        }

        const sendButton =
            form.querySelector("[data-forgot-send]");

        const resendButton =
            form.querySelector("[data-forgot-resend]");

        if (sendButton) {

            sendButton.addEventListener(
                "click",
                handleSendCode
            );
        }

        if (resendButton) {

            resendButton.addEventListener(
                "click",
                handleResendCode
            );
        }

        form.addEventListener(
            "submit",
            handleVerifyCode
        );

        // Start fresh from step one every time someone arrives
        // at the forgot-password tab.
        document
            .querySelectorAll("[data-switch-auth='forgot']")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    resetForgotForm
                );
            });

        // Also reset if they leave for login/signup mid-flow, so
        // a stale code isn't left waiting if they come back later.
        document
            .querySelectorAll("[data-auth-tab]")
            .forEach((tab) => {

                tab.addEventListener(
                    "click",
                    resetForgotForm
                );
            });
    }


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initForgotPassword);
    } else {
        initForgotPassword();
    }

})();