/* ============================================================
 * Admin Panel — Customers page behaviour
 * NEW FILE. Vanilla JS only. No API calls. Mock data only.
 * ============================================================ */

(function () {
    "use strict";

    var mockCustomersF = window.adminCustomersData || [];

    var CUSTOMER_STATUS_F = {
        active: { label: "فعال", color: "success" },
        inactive: { label: "غیرفعال", color: "neutral" }
    };

    var STATUS_LABEL_F = {
        registered: "ثبت شده",
        shipped: "ارسال شده",
        delivered: "تحویل داده شده"
    };

    // NOTE: "registered" intentionally has no --modifier class,
    // matching the teammate's storefront order-status styling
    // (plain dot, no colored pill) — see _orders.scss.
    var STATUS_MODIFIER_CLASS_F = {
        registered: "",
        shipped: "order-status--shipped",
        delivered: "order-status--delivered"
    };

    function formatNumberF(value) {
        return value.toLocaleString("fa-IR");
    }

    function customerCardHtmlF(customer) {
        var lastOrderDate = customer.orders.length
            ? customer.orders[0].date
            : "—";

        var statusInfo = CUSTOMER_STATUS_F[customer.status];

        return "" +
            "<div class=\"admin-customers-f__card-top\">" +
            "<div>" +
            "<p class=\"admin-customers-f__card-name\">" + customer.name + "</p>" +
            "<p class=\"admin-customers-f__card-id\">شناسه: #" + customer.id + "</p>" +
            "</div>" +
            "<div class=\"admin-customers-f__card-actions\">" +

            "<button type=\"button\" class=\"admin-icon-btn-f\" " +
            "data-view-orders-f=\"" + customer.id + "\" " +
            "aria-label=\"مشاهده سفارش‌های " + customer.name + "\">" +
            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" " +
            "stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<rect x=\"4\" y=\"7\" width=\"16\" height=\"13\" rx=\"1.5\" " +
            "stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7\" " +
            "stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>" +
            "</button>" +

            "<a href=\"admin-invoices-f.html\" class=\"admin-icon-btn-f\" " +
            "aria-label=\"ثبت فاکتور جدید برای " + customer.name + "\">" +
            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" " +
            "stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<path d=\"M7 3h8l4 4v14H5V3Z\" " +
            "stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M9 13h6M12 10v6\" " +
            "stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>" +
            "</a>" +

            "</div>" +
            "</div>" +

            "<div class=\"admin-customers-f__card-meta\">" +
            "<span dir=\"ltr\">" + customer.phone + "</span>" +
            "<span>عضویت: " + customer.joinDate + "</span>" +
            "<span>آخرین سفارش: " + lastOrderDate + "</span>" +
            "<span class=\"admin-badge-f admin-badge-f--" +
            statusInfo.color + "-f\">" + statusInfo.label + "</span>" +
            "</div>" +

            "<div class=\"admin-customers-f__card-stats\">" +
            "<div class=\"admin-customers-f__card-stat\">" +
            "<span>تعداد سفارش</span>" +
            "<strong>" + formatNumberF(customer.ordersCount) + "</strong>" +
            "</div>" +

            "<div class=\"admin-customers-f__card-stat " +
            "admin-customers-f__card-stat--amount\">" +
            "<span>مجموع خرید</span>" +
            "<strong>" + formatNumberF(customer.totalSpent) + " ریال</strong>" +
            "</div>" +
            "</div>";
    }

    function renderCustomerListF(customers) {
        var listEl = document.getElementById("adminCustomersListF");
        var emptyEl = document.getElementById("adminCustomersEmptyF");

        if (!listEl) return;

        listEl.innerHTML = "";

        if (!customers.length) {
            if (emptyEl) emptyEl.hidden = false;
            return;
        }

        if (emptyEl) emptyEl.hidden = true;

        customers.forEach(function (customer) {
            var li = document.createElement("li");

            li.className = "admin-customers-f__card";
            li.setAttribute("data-customer-card-f", customer.id);
            li.innerHTML = customerCardHtmlF(customer);

            listEl.appendChild(li);
        });
    }

    var currentSearchF = "";
    var currentSortF = "newest";

    function applyFiltersF() {
        var filtered = mockCustomersF.filter(function (c) {
            if (!currentSearchF) return true;

            var q = currentSearchF;

            return (
                c.name.indexOf(q) !== -1 ||
                c.phone.indexOf(q) !== -1 ||
                c.id.toLowerCase().indexOf(q.toLowerCase()) !== -1
            );
        });

        var sorted = filtered.slice();

        switch (currentSortF) {
            case "oldest":
                sorted.reverse();
                break;

            case "most-spent":
                sorted.sort(function (a, b) {
                    return b.totalSpent - a.totalSpent;
                });
                break;

            case "most-orders":
                sorted.sort(function (a, b) {
                    return b.ordersCount - a.ordersCount;
                });
                break;

            case "name":
                sorted.sort(function (a, b) {
                    return a.name.localeCompare(b.name, "fa");
                });
                break;

            case "newest":
            default:
                break;
        }

        renderCustomerListF(sorted);
    }

    function initToolbarF() {
        var searchInput = document.getElementById("adminCustomerSearchF");
        var sortSelect = document.getElementById("adminCustomerSortF");

        if (searchInput) {
            searchInput.addEventListener("input", function () {
                currentSearchF = searchInput.value.trim();
                applyFiltersF();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener("change", function () {
                currentSortF = sortSelect.value;
                applyFiltersF();
            });
        }
    }

    /* ============================================================
     * Add Customer Modal
     * Frontend validation only.
     * Valid form is submitted to Django backend.
     * ============================================================ */

    function toEnglishDigitsF(value) {
        return value
            .replace(/[۰-۹]/g, function (digit) {
                return String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit));
            })
            .replace(/[٠-٩]/g, function (digit) {
                return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
            });
    }

    function isValidIranianMobileF(phone) {
        var normalized = toEnglishDigitsF(phone)
            .replace(/[\s-]/g, "");

        return /^09\d{9}$/.test(normalized) ||
            /^\+989\d{9}$/.test(normalized);
    }

    function initAddCustomerModalF() {
        var modal = document.getElementById("adminAddCustomerModalF");
        var openBtn = document.getElementById("adminAddCustomerBtnF");
        var closeBtn = document.getElementById("adminAddCustomerCloseF");
        var form = document.getElementById("adminAddCustomerFormF");

        if (!modal || !openBtn || !form) return;

        var firstNameInput =
            document.getElementById("adminNewCustomerFirstNameF");

        var lastNameInput =
            document.getElementById("adminNewCustomerLastNameF");

        var phoneInput =
            document.getElementById("adminNewCustomerPhoneF");

        var usernameInput =
            document.getElementById("adminNewCustomerUsernameF");

        var passwordInput =
            document.getElementById("adminNewCustomerPasswordF");

        var addressInput =
            document.getElementById("adminNewCustomerAddressF");

        var allInputs = [
            firstNameInput,
            lastNameInput,
            phoneInput,
            usernameInput,
            passwordInput,
            addressInput
        ];

        function getGroup(input) {
            if (!input) return null;

            return input.closest(".admin-customers-f__form-group");
        }

        function setFieldError(input, message) {
            var group = getGroup(input);

            if (!group) return;

            group.classList.add("has-error");

            var errorEl =
                group.querySelector(".admin-customers-f__form-error");

            if (errorEl) {
                errorEl.textContent = message;
            }
        }

        function clearFieldError(input) {
            var group = getGroup(input);

            if (!group) return;

            group.classList.remove("has-error");

            var errorEl =
                group.querySelector(".admin-customers-f__form-error");

            if (errorEl) {
                errorEl.textContent = "";
            }
        }

        function clearAllErrors() {
            allInputs.forEach(function (input) {
                clearFieldError(input);
            });
        }

        function openModal() {
            modal.hidden = false;

            clearAllErrors();

            if (firstNameInput) {
                firstNameInput.focus();
            }
        }

        function closeModal() {
            modal.hidden = true;

            form.reset();
            clearAllErrors();
        }

        openBtn.addEventListener("click", openModal);

        if (closeBtn) {
            closeBtn.addEventListener("click", closeModal);
        }

        var backdrop = modal.querySelector(".modal__backdrop");

        if (backdrop) {
            backdrop.addEventListener("click", closeModal);
        }

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) {
                closeModal();
            }
        });

        /*
         * Clear each field's error as soon as the user starts
         * correcting that field.
         */
        allInputs.forEach(function (input) {
            if (!input) return;

            input.addEventListener("input", function () {
                clearFieldError(input);
            });
        });

        form.addEventListener("submit", function (event) {
            clearAllErrors();

            var firstName = firstNameInput
                ? firstNameInput.value.trim()
                : "";

            var lastName = lastNameInput
                ? lastNameInput.value.trim()
                : "";

            var phone = phoneInput
                ? phoneInput.value.trim()
                : "";

            var username = usernameInput
                ? usernameInput.value.trim()
                : "";

            var password = passwordInput
                ? passwordInput.value
                : "";

            var address = addressInput
                ? addressInput.value.trim()
                : "";

            var hasError = false;

            /* First name */
            if (!firstName) {
                setFieldError(
                    firstNameInput,
                    "لطفاً نام مشتری را وارد کنید."
                );

                hasError = true;
            }

            /* Last name */
            if (!lastName) {
                setFieldError(
                    lastNameInput,
                    "لطفاً نام خانوادگی مشتری را وارد کنید."
                );

                hasError = true;
            }

            /* Phone */
            if (!phone) {
                setFieldError(
                    phoneInput,
                    "لطفاً شماره موبایل را وارد کنید."
                );

                hasError = true;
            } else if (!isValidIranianMobileF(phone)) {
                setFieldError(
                    phoneInput,
                    "شماره موبایل واردشده معتبر نیست."
                );

                hasError = true;
            }

            /* Username */
            if (!username) {
                setFieldError(
                    usernameInput,
                    "لطفاً نام کاربری را وارد کنید."
                );

                hasError = true;
            } else if (username.length < 4) {
                setFieldError(
                    usernameInput,
                    "نام کاربری باید حداقل ۴ کاراکتر باشد."
                );

                hasError = true;
            } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                setFieldError(
                    usernameInput,
                    "نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و _ باشد."
                );

                hasError = true;
            }

            /* Password */
            if (!password) {
                setFieldError(
                    passwordInput,
                    "لطفاً رمز عبور را وارد کنید."
                );

                hasError = true;
            } else if (password.length < 6) {
                setFieldError(
                    passwordInput,
                    "رمز عبور باید حداقل ۶ کاراکتر باشد."
                );

                hasError = true;
            }

            /* Address */
            if (!address) {
                setFieldError(
                    addressInput,
                    "لطفاً آدرس مشتری را وارد کنید."
                );

                hasError = true;
            }

            /*
             * Only prevent submission when frontend validation fails.
             *
             * If the form is valid, we intentionally do NOT call
             * preventDefault().
             *
             * Django/backend is responsible for creating the customer.
             */
            if (hasError) {
                event.preventDefault();
                return;
            }

            // فرم معتبر است؛ اجازه می‌دهیم POST به Django انجام شود.
        });
    }

    function orderCardHtmlF(order) {
        var modifierClass = STATUS_MODIFIER_CLASS_F[order.status];

        var statusClass =
            "order-status" +
            (modifierClass ? " " + modifierClass : "");

        return "" +
            "<li class=\"order-card\">" +
            "<div class=\"order-card__top\">" +
            "<span class=\"" + statusClass + "\">" +
            STATUS_LABEL_F[order.status] +
            "</span>" +
            "<span class=\"order-card__number\">سفارش " +
            order.number +
            "</span>" +
            "</div>" +

            "<div class=\"order-card__bottom\">" +
            "<span class=\"order-card__total\">" +
            formatNumberF(order.amount) +
            " ریال</span>" +
            "<span class=\"order-card__date\">" +
            order.date +
            "</span>" +
            "</div>" +
            "</li>";
    }

    function initOrdersModalF() {
        var modal =
            document.getElementById("adminCustomerOrdersModalF");

        var closeBtn =
            document.getElementById("adminCustomerOrdersCloseF");

        var titleEl =
            document.getElementById("adminCustomerOrdersTitleF");

        var summaryEl =
            document.getElementById("adminCustomerOrdersSummaryF");

        var listEl =
            document.getElementById("adminCustomerOrdersListF");

        var emptyEl =
            document.getElementById("adminCustomerOrdersEmptyF");

        if (!modal) return;

        function closeModal() {
            modal.hidden = true;
        }

        function openModalFor(customerId) {
            var customer = mockCustomersF.filter(function (c) {
                return c.id === customerId;
            })[0];

            if (!customer) return;

            titleEl.textContent =
                "سفارش‌های " + customer.name;

            summaryEl.innerHTML =
                "شناسه: <strong>#" +
                customer.id +
                "</strong> · " +
                "تعداد سفارش: <strong>" +
                formatNumberF(customer.ordersCount) +
                "</strong> · " +
                "مجموع خرید: <strong>" +
                formatNumberF(customer.totalSpent) +
                " ریال</strong>";

            listEl.innerHTML = "";

            if (!customer.orders.length) {
                if (emptyEl) emptyEl.hidden = false;
            } else {
                if (emptyEl) emptyEl.hidden = true;

                customer.orders.forEach(function (order) {
                    listEl.insertAdjacentHTML(
                        "beforeend",
                        orderCardHtmlF(order)
                    );
                });
            }

            modal.hidden = false;
        }

        /*
         * Event delegation — card list is re-rendered
         * on search/sort.
         */
        document.addEventListener("click", function (event) {
            var trigger =
                event.target.closest("[data-view-orders-f]");

            if (trigger) {
                openModalFor(
                    trigger.getAttribute("data-view-orders-f")
                );
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener("click", closeModal);
        }

        var ordersBackdrop =
            modal.querySelector(".modal__backdrop");

        if (ordersBackdrop) {
            ordersBackdrop.addEventListener("click", closeModal);
        }

        document.addEventListener("keydown", function (event) {
            if (
                event.key === "Escape" &&
                !modal.hidden
            ) {
                closeModal();
            }
        });
    }

    function initAdminCustomersF() {
        renderCustomerListF(mockCustomersF);
        initToolbarF();
        initAddCustomerModalF();
        initOrdersModalF();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initAdminCustomersF
        );
    } else {
        initAdminCustomersF();
    }

})();