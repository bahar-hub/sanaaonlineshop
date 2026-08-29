/* ============================================================
 * Admin Panel — Customers page behaviour
 * NEW FILE. Vanilla JS only. No API calls. Mock data only.
 * ============================================================ */

(function () {
    "use strict";


    /* --------------------------------------------------------
     * Mock data
     * -------------------------------------------------------- */

    var mockCustomersF = [
        { id: "C-1042", name: "سارا احمدی", phone: "۰۹۱۲۳۴۵۶۷۸۹", joinDate: "۱۴۰۴/۰۲/۱۵", ordersCount: 12, totalSpent: 45340000, status: "active",
            orders: [
                { number: "SN-10482", date: "۱۴۰۴/۰۵/۱۲", amount: 45340000, status: "delivered" },
                { number: "SN-10417", date: "۱۴۰۴/۰۴/۲۸", amount: 41230000, status: "shipped" },
                { number: "SN-10355", date: "۱۴۰۴/۰۴/۰۳", amount: 39290000, status: "registered" }
            ] },
        { id: "C-1041", name: "مریم رضایی", phone: "۰۹۱۳۴۵۶۷۸۹۰", joinDate: "۱۴۰۴/۰۱/۰۸", ordersCount: 5, totalSpent: 12860000, status: "active",
            orders: [
                { number: "SN-10460", date: "۱۴۰۴/۰۵/۰۲", amount: 8600000, status: "shipped" },
                { number: "SN-10298", date: "۱۴۰۳/۱۱/۲۰", amount: 4260000, status: "delivered" }
            ] },
        { id: "C-1040", name: "نگار محمدی", phone: "۰۹۱۹۸۷۶۵۴۳۲", joinDate: "۱۴۰۳/۱۲/۰۱", ordersCount: 21, totalSpent: 98450000, status: "active",
            orders: [
                { number: "SN-10475", date: "۱۴۰۴/۰۵/۰۸", amount: 21400000, status: "registered" },
                { number: "SN-10412", date: "۱۴۰۴/۰۴/۲۵", amount: 15600000, status: "delivered" },
                { number: "SN-10380", date: "۱۴۰۴/۰۴/۱۰", amount: 9800000, status: "delivered" }
            ] },
        { id: "C-1039", name: "الهام کریمی", phone: "۰۹۱۵۲۲۳۳۴۴۵", joinDate: "۱۴۰۳/۱۰/۱۹", ordersCount: 3, totalSpent: 5400000, status: "inactive",
            orders: [
                { number: "SN-10390", date: "۱۴۰۴/۰۳/۱۴", amount: 5400000, status: "delivered" }
            ] },
        { id: "C-1038", name: "کیانا ملکی", phone: "۰۹۱۷۷۶۵۴۳۲۱", joinDate: "۱۴۰۴/۰۳/۳۰", ordersCount: 8, totalSpent: 26700000, status: "active",
            orders: [
                { number: "SN-10470", date: "۱۴۰۴/۰۵/۰۵", amount: 12300000, status: "shipped" },
                { number: "SN-10320", date: "۱۴۰۴/۰۳/۱۱", amount: 14400000, status: "delivered" }
            ] },
        { id: "C-1037", name: "بهاره اسدی", phone: "۰۹۱۴۴۵۵۶۶۷۷", joinDate: "۱۴۰۳/۰۹/۰۲", ordersCount: 1, totalSpent: 1980000, status: "inactive",
            orders: [
                { number: "SN-10201", date: "۱۴۰۳/۰۹/۰۵", amount: 1980000, status: "delivered" }
            ] }
    ];

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


    /* --------------------------------------------------------
     * Helpers
     * -------------------------------------------------------- */

    function formatNumberF(value) {
        return value.toLocaleString("fa-IR");
    }


    /* --------------------------------------------------------
     * Rendering the customer list
     * -------------------------------------------------------- */

    function customerCardHtmlF(customer) {
        var lastOrderDate = customer.orders.length ? customer.orders[0].date : "—";
        var statusInfo = CUSTOMER_STATUS_F[customer.status];

        return "" +
            "<div class=\"admin-customers-f__card-top\">" +
            "<div>" +
            "<p class=\"admin-customers-f__card-name\">" + customer.name + "</p>" +
            "<p class=\"admin-customers-f__card-id\">شناسه: #" + customer.id + "</p>" +
            "</div>" +
            "<div class=\"admin-customers-f__card-actions\">" +
            "<button type=\"button\" class=\"admin-icon-btn-f\" data-view-orders-f=\"" + customer.id + "\" aria-label=\"مشاهده سفارش‌های " + customer.name + "\">" +
            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<rect x=\"4\" y=\"7\" width=\"16\" height=\"13\" rx=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>" +
            "</button>" +
            "<a href=\"admin-invoices-f.html\" class=\"admin-icon-btn-f\" aria-label=\"ثبت فاکتور جدید برای " + customer.name + "\">" +
            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<path d=\"M7 3h8l4 4v14H5V3Z\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M9 13h6M12 10v6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>" +
            "</a>" +
            "</div>" +
            "</div>" +
            "<div class=\"admin-customers-f__card-meta\">" +
            "<span dir=\"ltr\">" + customer.phone + "</span>" +
            "<span>عضویت: " + customer.joinDate + "</span>" +
            "<span>آخرین سفارش: " + lastOrderDate + "</span>" +
            "<span class=\"admin-badge-f admin-badge-f--" + statusInfo.color + "-f\">" + statusInfo.label + "</span>" +
            "</div>" +
            "<div class=\"admin-customers-f__card-stats\">" +
            "<div class=\"admin-customers-f__card-stat\">" +
            "<span>تعداد سفارش</span>" +
            "<strong>" + formatNumberF(customer.ordersCount) + "</strong>" +
            "</div>" +
            "<div class=\"admin-customers-f__card-stat admin-customers-f__card-stat--amount\">" +
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


    /* --------------------------------------------------------
     * Search + sort
     * -------------------------------------------------------- */

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
                sorted.sort(function (a, b) { return b.totalSpent - a.totalSpent; });
                break;
            case "most-orders":
                sorted.sort(function (a, b) { return b.ordersCount - a.ordersCount; });
                break;
            case "name":
                sorted.sort(function (a, b) { return a.name.localeCompare(b.name, "fa"); });
                break;
            case "newest":
            default:
                // mock array is already newest-first
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


    /* --------------------------------------------------------
     * Add-customer modal
     * -------------------------------------------------------- */

    function initAddCustomerModalF() {
        var modal = document.getElementById("adminAddCustomerModalF");
        var openBtn = document.getElementById("adminAddCustomerBtnF");
        var closeBtn = document.getElementById("adminAddCustomerCloseF");
        var form = document.getElementById("adminAddCustomerFormF");

        if (!modal || !openBtn || !form) return;

        function openModal() {
            modal.hidden = false;
        }

        function closeModal() {
            modal.hidden = true;
            form.reset();
            form.querySelectorAll(".admin-customers-f__form-group").forEach(function (group) {
                group.classList.remove("has-error");
            });
        }

        openBtn.addEventListener("click", openModal);
        if (closeBtn) closeBtn.addEventListener("click", closeModal);

        modal.querySelector(".modal__backdrop").addEventListener("click", closeModal);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) closeModal();
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var nameInput = document.getElementById("adminNewCustomerNameF");
            var phoneInput = document.getElementById("adminNewCustomerPhoneF");

            var nameGroup = nameInput.closest(".admin-customers-f__form-group");
            var phoneGroup = phoneInput.closest(".admin-customers-f__form-group");

            nameGroup.classList.toggle("has-error", nameInput.value.trim() === "");
            phoneGroup.classList.toggle("has-error", phoneInput.value.trim() === "");

            if (nameInput.value.trim() === "" || phoneInput.value.trim() === "") {
                return;
            }

            var emailInput = document.getElementById("adminNewCustomerEmailF");
            var newId = "C-" + (1043 + mockCustomersF.length);

            mockCustomersF.unshift({
                id: newId,
                name: nameInput.value.trim(),
                phone: phoneInput.value.trim(),
                joinDate: "امروز",
                ordersCount: 0,
                totalSpent: 0,
                status: "active",
                orders: []
            });

            closeModal();
            currentSortF = "newest";
            var sortSelect = document.getElementById("adminCustomerSortF");
            if (sortSelect) sortSelect.value = "newest";
            applyFiltersF();
        });
    }


    /* --------------------------------------------------------
     * "Customer orders" modal
     * -------------------------------------------------------- */

    function orderCardHtmlF(order) {
        var modifierClass = STATUS_MODIFIER_CLASS_F[order.status];
        var statusClass = "order-status" + (modifierClass ? " " + modifierClass : "");

        return "" +
            "<li class=\"order-card\">" +
            "<div class=\"order-card__top\">" +
            "<span class=\"" + statusClass + "\">" + STATUS_LABEL_F[order.status] + "</span>" +
            "<span class=\"order-card__number\">سفارش " + order.number + "</span>" +
            "</div>" +
            "<div class=\"order-card__bottom\">" +
            "<span class=\"order-card__total\">" + formatNumberF(order.amount) + " ریال</span>" +
            "<span class=\"order-card__date\">" + order.date + "</span>" +
            "</div>" +
            "</li>";
    }

    function initOrdersModalF() {
        var modal = document.getElementById("adminCustomerOrdersModalF");
        var closeBtn = document.getElementById("adminCustomerOrdersCloseF");
        var titleEl = document.getElementById("adminCustomerOrdersTitleF");
        var summaryEl = document.getElementById("adminCustomerOrdersSummaryF");
        var listEl = document.getElementById("adminCustomerOrdersListF");
        var emptyEl = document.getElementById("adminCustomerOrdersEmptyF");

        if (!modal) return;

        function closeModal() {
            modal.hidden = true;
        }

        function openModalFor(customerId) {
            var customer = mockCustomersF.filter(function (c) { return c.id === customerId; })[0];
            if (!customer) return;

            titleEl.textContent = "سفارش‌های " + customer.name;
            summaryEl.innerHTML =
                "شناسه: <strong>#" + customer.id + "</strong> · " +
                "تعداد سفارش: <strong>" + formatNumberF(customer.ordersCount) + "</strong> · " +
                "مجموع خرید: <strong>" + formatNumberF(customer.totalSpent) + " ریال</strong>";

            listEl.innerHTML = "";
            if (!customer.orders.length) {
                if (emptyEl) emptyEl.hidden = false;
            } else {
                if (emptyEl) emptyEl.hidden = true;
                customer.orders.forEach(function (order) {
                    listEl.insertAdjacentHTML("beforeend", orderCardHtmlF(order));
                });
            }

            modal.hidden = false;
        }

        // event delegation — card list is re-rendered on search/sort
        document.addEventListener("click", function (event) {
            var trigger = event.target.closest("[data-view-orders-f]");
            if (trigger) {
                openModalFor(trigger.getAttribute("data-view-orders-f"));
            }
        });

        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        modal.querySelector(".modal__backdrop").addEventListener("click", closeModal);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) closeModal();
        });
    }


    /* --------------------------------------------------------
     * Init
     * -------------------------------------------------------- */

    function initAdminCustomersF() {
        renderCustomerListF(mockCustomersF);
        initToolbarF();
        initAddCustomerModalF();
        initOrdersModalF();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAdminCustomersF);
    } else {
        initAdminCustomersF();
    }

})();