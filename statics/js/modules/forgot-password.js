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
    let resendTimer = null;


    // ========================================
    // Helpers
    // ========================================

    /* function findUserByPhone(phone) {

        const users = getUsers();

        return users.find((user) => {
            return user.phone === phone;
        }) || null;
    }


    function generateOtpCode() {

        return String(
            Math.floor(1000 + Math.random() * 9000)
        );
    } */


    function getCookie(name) {

    let cookieValue = null;

    if (document.cookie) {

        const cookies =
            document.cookie.split(";");


        for (let cookie of cookies) {

            cookie = cookie.trim();

            if (
                cookie.startsWith(name + "=")
            ) {

                cookieValue =
                    decodeURIComponent(
                        cookie.substring(
                            name.length + 1
                        )
                    );

                break;
            }
        }
    }

    return cookieValue;
}


    function startResendTimer(seconds = 60) {

    const resendButton =
        document.querySelector("[data-forgot-resend]");


    if (!resendButton) {
        return;
    }


    let remaining = seconds;


    resendButton.disabled = true;


    resendButton.textContent =
        `ارسال مجدد (${remaining})`;


    clearInterval(resendTimer);


    resendTimer = setInterval(() => {


        remaining--;


        resendButton.textContent =
            `ارسال مجدد (${remaining})`;


        if (remaining <= 0) {


            clearInterval(resendTimer);


            resendButton.disabled = false;


            resendButton.textContent =
                "ارسال مجدد رمز";

        }


    }, 1000);

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

    const phoneInput = document.getElementById("forgotPhone");
    const phone = phoneInput.value.trim();
    const phonePattern = /^09\d{9}$/;

    if (!phonePattern.test(phone)) {
        showAuthError("شماره تلفن معتبر نیست.", "forgotForm");
        return;
    }

    // Store phone immediately
    pendingReset = { phone: phone };

    const hint = document.getElementById("forgotHint");
    const codeInput = document.getElementById("forgotCode");
    const sendButton = document.querySelector("[data-forgot-send]");
    const verifyButton = document.querySelector(
        '[data-forgot-step="code"] button[type="submit"]'
    );

    if (codeInput) {
        codeInput.value = "";
    }

    // Immediately open OTP step
    showStep("code");

    if (hint) {
        hint.textContent = "در حال ارسال کد تأیید...";
    }

    if (sendButton) sendButton.disabled = true;
    if (verifyButton) verifyButton.disabled = true;

    fetch("/profile/password-reset/request/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify({ phone: phone })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (!data.success) {
            if (hint) {
                hint.textContent = "ارسال کد تأیید ناموفق بود.";
            }
            showAuthError(
                data.message || "خطا در ارسال پیامک.",
                "forgotForm"
            );
            return;
        }

        if (hint) {
            hint.textContent = `کد تأیید برای شماره ${phone} ارسال شد.`;
        }

        if (verifyButton) verifyButton.disabled = false;
        startResendTimer(60);
    })
    .catch(() => {
        if (hint) {
            hint.textContent =
                "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.";
        }

        showAuthError(
            "خطا در ارتباط با سرور.",
            "forgotForm"
        );
    })
    .finally(() => {
        if (sendButton) sendButton.disabled = false;
    });
}


    // ========================================
    // Step 2 — Resend Code
    // ========================================

    function handleResendCode() {

    clearAuthError("forgotForm");


    if (!pendingReset || !pendingReset.phone) {

        showStep("phone");

        return;
    }


    fetch("/profile/password-reset/request/", {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "X-CSRFToken": getCookie("csrftoken")

        },

        body: JSON.stringify({

            phone: pendingReset.phone

        })

    })


    .then(response => response.json())


    .then(data => {


        if (!data.success) {

            showAuthError(
                data.message,
                "forgotForm"
            );

            return;

        }


        const hint =
            document.getElementById("forgotHint");


        if (hint) {

            hint.textContent =
                `کد تایید مجدد برای شماره ${pendingReset.phone} ارسال شد.`;

        }


        const codeInput =
            document.getElementById("forgotCode");


        if (codeInput) {

            codeInput.value = "";


        }
        startResendTimer(60);



    })


    .catch(() => {


        showAuthError(
            "خطا در ارتباط با سرور.",
            "forgotForm"
        );


    });

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


fetch("/profile/password-reset/verify/", {

    method: "POST",

    headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken")
    },

    body: JSON.stringify({

        phone: pendingReset.phone,

        code: enteredCode

    })

})

.then(response => response.json())

.then(data => {


    if (!data.success) {

        showAuthError(
            data.message,
            "forgotForm"
        );

        return;
    }


    // فعلاً تایید موفق را نگه می‌داریم
    // مرحله بعد تغییر رمز اضافه می‌شود

    window.location.href = "/";


})

.catch(() => {

    showAuthError(
        "خطا در ارتباط با سرور.",
        "forgotForm"
    );

});
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