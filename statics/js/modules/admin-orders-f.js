/* ============================================================
 * Admin Panel — Order Management
 * Standalone Orders Page
 * Vanilla JS only
 * Orders are loaded from Django / database
 * ============================================================ */
(function () {

    "use strict";

    const CURRENCY_FIELD_MAP_F = {
        USD: "unitPriceUsd",
        EUR: "unitPriceEur",
        TRY: "unitPriceTry",
        GBP: "unitPriceGbp",
        AED: "unitPriceAed"
    };
    /* ============================================================
     * EXCHANGE RATES
     * ============================================================ */

    var EXCHANGE_RATES_F = {

        USD: {
            label: "دلار",
            rate: 605000
        },

        TRY: {
            label: "لیر",
            rate: 18000
        },

        EUR: {
            label: "یورو",
            rate: 655000
        },

        GBP: {
            label: "پوند",
            rate: 765000
        },

        AED: {
            label: "درهم امارات",
            rate: 165000
        }

    };


    /* ============================================================
     * ORDERS DATA — injected by Django via json_script
     * ============================================================ */

    var ordersF = [];

    var ordersDataElementF =
        document.getElementById(
            "orders-data-f"
        );

    if (ordersDataElementF) {

        try {

            var parsedOrdersF =
                JSON.parse(
                    ordersDataElementF.textContent
                );

            ordersF =
                Array.isArray(parsedOrdersF)
                    ? parsedOrdersF
                    : [];

        } catch (error) {

            console.error(
                "Could not parse orders data:",
                error
            );

            ordersF = [];
        }
    }


    function findOrderByNumberF(orderNumber) {

        return ordersF.find(
            function (order) {

                return (
                    order.number ===
                    orderNumber
                );

            }
        );
    }


    function replaceOrderF(savedOrder) {

        var index =
            ordersF.findIndex(
                function (order) {

                    return (
                        Number(order.id) ===
                        Number(savedOrder.id)
                    );

                }
            );


        if (index === -1) {

            ordersF.unshift(
                savedOrder
            );

        } else {

            ordersF[index] =
                savedOrder;
        }
    }


    function buildOrderUrlF(template, orderId) {

        if (!template) {
            return "";
        }

        return template.replace(
            "/0/",
            "/" + orderId + "/"
        );
    }


    function getCsrfTokenF() {

        var input =
            document.querySelector(
                'input[name="csrfmiddlewaretoken"]'
            );

        return input
            ? input.value
            : "";
    }


    function fetchJsonF(url, options) {

        return fetch(
            url,
            options
        )
        .then(function (response) {

            return response
                .text()
                .then(function (text) {

                    var data = {};

                    try {

                        data =
                            JSON.parse(
                                text
                            );

                    } catch (error) {

                        console.error(
                            "Invalid JSON response:",
                            text
                        );
                    }


                    if (!response.ok) {

                        throw new Error(
                            data.message ||
                            (
                                "خطای سرور: " +
                                response.status
                            )
                        );
                    }


                    return data;
                });

        });
    }


    var openEditOrderModalF =
        null;


    /* ============================================================
     * STATUS MAPS
     * ============================================================ */

    var ORDER_STATUS_F = {
        registered: "ثبت شده",
        preparing: "در حال آماده سازی",
        shipped: "ارسال شده"
    };


    var PAYMENT_STATUS_F = {
        pending: "در انتظار پرداخت",
        partial: "پرداخت ناقص",
        paid: "پرداخت شده"
    };

    var INVOICE_STATUS_F = {

        issued: {
            label: "صادرشده",
            color: "success"
        },

        sent: {
            label: "ارسال‌شده",
            color: "primary"
        },

        waiting: {
            label: "در انتظار صدور",
            color: "warning"
        },

        error: {
            label: "خطا در تولید فاکتور",
            color: "danger"
        }

    };


    /* ============================================================
     * HELPERS
     * ============================================================ */

    function formatNumberF(value) {

        return Math.round(value).toLocaleString("fa-IR");

    }


    function currentJalaliDateF() {

        try {

            return new Intl.DateTimeFormat(
                "fa-IR-u-ca-persian",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(
                new Date()
            );

        } catch (error) {

            return "";

        }

    }


    function unitPriceF(product) {

        if (typeof product.unitPriceUsd === "number") {
            return product.unitPriceUsd;
        }

        if (typeof product.unitPriceEur === "number") {
            return product.unitPriceEur;
        }

        if (typeof product.unitPriceTry === "number") {
            return product.unitPriceTry;
        }

        if (typeof product.unitPriceGbp === "number") {
            return product.unitPriceGbp;
        }

        if (typeof product.unitPriceAed === "number") {
            return product.unitPriceAed;
        }

        return 0;

    }


    function orderTotalsF(order) {

        var products =
            Array.isArray(order.products)
                ? order.products
                : [];

        var baseAmount =
            products.reduce(
                function (sum, product) {

                    return (
                        sum +
                        unitPriceF(product) *
                        (Number(product.qty) || 0)
                    );

                },
                0
            );


        var productsRial =
            products.reduce(
                function (sum, product) {

                    var currency =
                        product.currency ||
                        order.currency;

                    var rate =
                        typeof product.exchangeRate === "number"
                            ? product.exchangeRate
                            : (
                                EXCHANGE_RATES_F[currency]
                                    ? EXCHANGE_RATES_F[currency].rate
                                    : 0
                            );

                    return (
                        sum +
                        unitPriceF(product) *
                        (Number(product.qty) || 0) *
                        rate
                    );

                },
                0
            );


        var totalRial =
            productsRial -
            (Number(order.discountRial) || 0) +
            (Number(order.shippingRial) || 0) +
            (Number(order.serviceRial) || 0);


        return {

            baseAmount: baseAmount,
            productsRial: productsRial,
            totalRial: totalRial,

            rate:
                EXCHANGE_RATES_F[order.currency]
                    ? EXCHANGE_RATES_F[order.currency].rate
                    : 0

        };

    }

    function badgeHtmlF(statusMap, key) {

        var entry = statusMap[key];

        if (!entry) {
            return "";
        }

        return (
            '<span class="admin-badge-f admin-badge-f--' +
            entry.color +
            '-f">' +
            entry.label +
            "</span>"
        );

    }


    function sheetRowF(label, value) {

        return (
            '<div class="admin-orders-f__sheet-row">' +
            "<span>" +
            label +
            "</span>" +
            "<span>" +
            value +
            "</span>" +
            "</div>"
        );

    }


    /* ============================================================
     * TOAST
     * ============================================================ */

    function showToastF(message, type) {

        var region =
            document.getElementById("adminToastRegionF");

        if (!region) {
            return;
        }


        var toast =
            document.createElement("div");


        toast.className =
            "admin-toast-f" +
            (type
                ? " admin-toast-f--" + type + "-f"
                : "");


        toast.innerHTML =
            (
                type === "error"

                    ?

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                    '<circle cx="12" cy="12" r="9"/>' +
                    '<path d="M12 8v5M12 16h.01" stroke-linecap="round"/>' +
                    "</svg>"

                    :

                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                    '<path d="m5 13 4 4 10-10" stroke-linecap="round" stroke-linejoin="round"/>' +
                    "</svg>"

            ) +

            "<span>" +
            message +
            "</span>";


        region.appendChild(toast);


        window.setTimeout(function () {

            toast.remove();

        }, 3200);

    }


    /* ============================================================
     * TABLE
     * ============================================================ */

    function productSummaryF(order) {

        var first =
            order.products[0].name;


        if (order.products.length > 1) {

            return (
                first +
                "<small>+ " +
                formatNumberF(
                    order.products.length - 1
                ) +
                " محصول دیگر</small>"
            );

        }


        return (
            first +
            "<small>تعداد: " +
            formatNumberF(
                order.products[0].qty
            ) +
            "</small>"
        );

    }


    function actionButtonsHtmlF(orderNumber) {
        return "" +

            /* مشاهده جزئیات */
            "<button type=\"button\" class=\"admin-icon-btn-f\" " +
            "data-view-order-f=\"" + orderNumber + "\" " +
            "aria-label=\"مشاهده جزئیات سفارش " + orderNumber + "\" " +
            "title=\"مشاهده جزئیات\">" +

            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<path d=\"M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<circle cx=\"12\" cy=\"12\" r=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>" +

            "</button>" +


            /* دانلود PDF */
            "<button type=\"button\" class=\"admin-icon-btn-f admin-icon-btn-f--download-f\" " +
            "data-download-order-f=\"" + orderNumber + "\" " +
            "aria-label=\"دانلود PDF سفارش " + orderNumber + "\" " +
            "title=\"دانلود PDF\">" +

            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<path d=\"M12 3v12m0 0-4-4m4 4 4-4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>" +

            "</button>" +


            /* حذف سفارش */
            "<button type=\"button\" class=\"admin-icon-btn-f admin-icon-btn-f--delete-f\" " +
            "data-delete-order-f=\"" + orderNumber + "\" " +
            "aria-label=\"حذف سفارش " + orderNumber + "\" " +
            "title=\"حذف سفارش\">" +

            "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\">" +
            "<path d=\"M4 7h16\" stroke-linecap=\"round\"/>" +
            "<path d=\"M9 7V4h6v3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M6 7l1 13h10l1-13\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M10 11v5M14 11v5\" stroke-linecap=\"round\"/>" +
            "</svg>" +

            "</button>";
    }


    function tableRowHtmlF(order) {

        var totals =
            orderTotalsF(order);


        var currencyLabel =
            EXCHANGE_RATES_F[
                order.currency
            ].label;


        return (

            "<tr data-order-row-f=\"" +
            order.number +
            "\">" +


            "<td>" +
            order.number +
            "</td>" +


            "<td>" +
            order.customer.name +
            "</td>" +


            "<td>" +
            order.date +
            "</td>" +


            "<td>" +
            formatNumberF(
                totals.baseAmount
            ) +
            "</td>" +


            '<td class="admin-orders-f__col--secondary-f">' +
            currencyLabel +
            "</td>" +


            '<td class="admin-orders-f__table-amount-rial">' +
            formatNumberF(
                totals.totalRial
            ) +
            " ریال</td>" +


            "<td>" +
            badgeHtmlF(
                PAYMENT_STATUS_F,
                order.paymentStatus
            ) +
            "</td>" +


            "<td>" +
            badgeHtmlF(
                ORDER_STATUS_F,
                order.orderStatus
            ) +
            "</td>" +


            '<td class="admin-orders-f__col--secondary-f">' +
            badgeHtmlF(
                INVOICE_STATUS_F,
                order.invoiceStatus
            ) +
            "</td>" +


            "<td>" +

            '<div class="admin-orders-f__table-actions">' +

            actionButtonsHtmlF(
                order.number
            ) +

            "</div>" +

            "</td>" +

            "</tr>"

        );

    }


    /* ============================================================
     * MOBILE CARD
     * ============================================================ */

    function cardHtmlF(order) {

        var totals =
            orderTotalsF(order);


        return (

            '<li class="admin-orders-f__card" data-order-row-f="' +
            order.number +
            '">' +


            '<div class="admin-orders-f__card-top">' +

            '<span class="admin-orders-f__card-number">' +
            order.number +
            "</span>" +

            badgeHtmlF(
                ORDER_STATUS_F,
                order.orderStatus
            ) +

            "</div>" +


            '<div class="admin-orders-f__card-body">' +

            "<span class=\"admin-orders-f__card-customer\">TEST CUSTOMER</span>" +


            '<span class="admin-orders-f__card-date">' +
            order.date +
            "</span>" +


            '<span class="admin-orders-f__card-amount">' +
            formatNumberF(
                totals.totalRial
            ) +
            " ریال</span>" +

            "</div>" +


            '<div class="admin-orders-f__card-bottom">' +

            '<span class="admin-orders-f__card-payment">' +

            badgeHtmlF(
                PAYMENT_STATUS_F,
                order.paymentStatus
            ) +

            "</span>" +


            '<div class="admin-orders-f__card-actions">' +

            actionButtonsHtmlF(
                order.number
            ) +

            "</div>" +

            "</div>" +

            "</li>"

        );

    }


    /* ============================================================
     * STATES + RENDER
     * ============================================================ */

    function setStateF(state) {

        [
            "Loading",
            "Empty",
            "Error"
        ].forEach(function (name) {

            var element =
                document.getElementById(
                    "adminOrders" +
                    name +
                    "F"
                );


            if (element) {

                element.hidden =
                    state !==
                    name.toLowerCase();

            }

        });


        var tableWrap =
            document.getElementById(
                "adminOrdersTableWrapF"
            );


        var cardsWrap =
            document.getElementById(
                "adminOrdersCardsF"
            );


        var show =
            !state;


        if (tableWrap) {

            tableWrap.style.display =
                show ? "" : "none";

        }


        if (cardsWrap) {

            cardsWrap.style.display =
                show ? "" : "none";

        }

    }


    function renderListF(orders) {

        var tbody =
            document.getElementById(
                "adminOrdersTableBodyF"
            );


        var cards =
            document.getElementById(
                "adminOrdersCardsF"
            );


        if (!orders.length) {

            if (tbody) {
                tbody.innerHTML = "";
            }

            if (cards) {
                cards.innerHTML = "";
            }

            setStateF("empty");

            return;

        }


        setStateF(null);


        if (tbody) {

            tbody.innerHTML =
                orders
                    .map(tableRowHtmlF)
                    .join("");

        }


        if (cards) {

            cards.innerHTML =
                orders
                    .map(cardHtmlF)
                    .join("");

        }

    }


    /* ============================================================
     * FILTERS
     * ============================================================ */

    var filtersF = {

        search: "",
        orderStatus: "all",
        paymentStatus: "all",
        invoiceStatus: "all",
        sort: "newest"

    };


    function applyFiltersF() {

        var filtered = ordersF.filter(
            function (order) {

                // وضعیت سفارش
                if (
                    filtersF.orderStatus !== "all" &&
                    order.orderStatus !== filtersF.orderStatus
                ) {
                    return false;
                }

                // وضعیت پرداخت
                if (
                    filtersF.paymentStatus !== "all" &&
                    order.paymentStatus !== filtersF.paymentStatus
                ) {
                    return false;
                }

                // وضعیت فاکتور
                if (
                    filtersF.invoiceStatus !== "all" &&
                    order.invoiceStatus !== filtersF.invoiceStatus
                ) {
                    return false;
                }

                // جستجو
                if (filtersF.search) {

                    var q =
                        filtersF.search
                            .toLowerCase()
                            .trim();

                    var orderNumber =
                        order.number
                            ? String(order.number).toLowerCase()
                            : "";

                    var customerName =
                        order.customer &&
                        order.customer.name
                            ? String(
                                order.customer.name
                            ).toLowerCase()
                            : "";

                    var matchesProduct =
                        Array.isArray(order.products)
                            ? order.products.some(
                                function (product) {

                                    var productName =
                                        product &&
                                        product.name
                                            ? String(
                                                product.name
                                            ).toLowerCase()
                                            : "";

                                    return (
                                        productName.indexOf(q) !== -1
                                    );
                                }
                            )
                            : false;

                    var matches =
                        orderNumber.indexOf(q) !== -1 ||
                        customerName.indexOf(q) !== -1 ||
                        matchesProduct;

                    if (!matches) {
                        return false;
                    }
                }

                return true;
            }
        );

        // یک کپی برای sort
        var sorted = filtered.slice();

        switch (filtersF.sort) {

            case "oldest":

                sorted.reverse();

                break;


            case "amount-desc":

                sorted.sort(
                    function (a, b) {

                        return (
                            orderTotalsF(b).totalRial -
                            orderTotalsF(a).totalRial
                        );
                    }
                );

                break;


            case "amount-asc":

                sorted.sort(
                    function (a, b) {

                        return (
                            orderTotalsF(a).totalRial -
                            orderTotalsF(b).totalRial
                        );
                    }
                );

                break;


            case "last-changed":

                sorted.sort(
                    function (a, b) {

                        var aDate =
                            a.lastChangeDate || "";

                        var bDate =
                            b.lastChangeDate || "";

                        if (aDate < bDate) {
                            return 1;
                        }

                        if (aDate > bDate) {
                            return -1;
                        }

                        return 0;
                    }
                );

                break;


            case "newest":
            default:

                break;
        }

        renderListF(sorted);
    }


    /* ============================================================
     * TOOLBAR
     * ============================================================ */

    function initToolbarF() {

        var searchInput =
            document.getElementById(
                "adminOrderSearchF"
            );


        var orderStatusSelect =
            document.getElementById(
                "adminOrderStatusFilterF"
            );


        var paymentStatusSelect =
            document.getElementById(
                "adminPaymentStatusFilterF"
            );


        var invoiceStatusSelect =
            document.getElementById(
                "adminInvoiceStatusFilterF"
            );


        var sortSelect =
            document.getElementById(
                "adminOrderSortF"
            );


        var clearBtn =
            document.getElementById(
                "adminClearFiltersF"
            );


        var exportBtn =
            document.getElementById(
                "adminExportOrdersF"
            );


        var filtersToggle =
            document.getElementById(
                "adminFiltersToggleF"
            );


        var filtersPanel =
            document.getElementById(
                "adminFiltersPanelF"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                function () {

                    filtersF.search =
                        searchInput.value.trim();

                    applyFiltersF();

                }
            );

        }


        if (orderStatusSelect) {

            orderStatusSelect.addEventListener(
                "change",
                function () {

                    filtersF.orderStatus =
                        orderStatusSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (paymentStatusSelect) {

            paymentStatusSelect.addEventListener(
                "change",
                function () {

                    filtersF.paymentStatus =
                        paymentStatusSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (invoiceStatusSelect) {

            invoiceStatusSelect.addEventListener(
                "change",
                function () {

                    filtersF.invoiceStatus =
                        invoiceStatusSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (sortSelect) {

            sortSelect.addEventListener(
                "change",
                function () {

                    filtersF.sort =
                        sortSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (clearBtn) {

            clearBtn.addEventListener(
                "click",
                function () {

                    filtersF = {

                        search: "",
                        orderStatus: "all",
                        paymentStatus: "all",
                        invoiceStatus: "all",
                        sort: "newest"

                    };


                    if (searchInput) {
                        searchInput.value = "";
                    }


                    if (orderStatusSelect) {
                        orderStatusSelect.value = "all";
                    }


                    if (paymentStatusSelect) {
                        paymentStatusSelect.value = "all";
                    }


                    if (invoiceStatusSelect) {
                        invoiceStatusSelect.value = "all";
                    }


                    if (sortSelect) {
                        sortSelect.value = "newest";
                    }


                    applyFiltersF();


                    showToastF(
                        "فیلترها پاک شد.",
                        "success"
                    );

                }
            );

        }


        if (exportBtn) {

            exportBtn.addEventListener(
                "click",
                exportOrdersCsvF
            );

        }


        if (
            filtersToggle &&
            filtersPanel
        ) {

            filtersToggle.addEventListener(
                "click",
                function () {

                    var isHidden =
                        filtersPanel.hasAttribute(
                            "hidden"
                        );


                    if (isHidden) {

                        filtersPanel.removeAttribute(
                            "hidden"
                        );

                    } else {

                        filtersPanel.setAttribute(
                            "hidden",
                            ""
                        );

                    }


                    filtersToggle.setAttribute(
                        "aria-expanded",
                        String(isHidden)
                    );

                }
            );

        }

    }


    /* ============================================================
     * CSV
     * ============================================================ */

    function exportOrdersCsvF() {

        var rows = [

            [
                "شماره سفارش",
                "مشتری",
                "تاریخ",
                "مبلغ ریالی",
                "وضعیت پرداخت",
                "وضعیت سفارش"
            ]

        ];


        


        ordersF.forEach(
            function (order) {

                var totals =
                    orderTotalsF(order);

                rows.push(
                    [
                        order.number || "",
                        order.customer
                            ? order.customer.name || ""
                            : "",
                        order.date || "",
                        Math.round(
                            totals.totalRial
                        ),
                        PAYMENT_STATUS_F[
                            order.paymentStatus
                        ]
                            ? PAYMENT_STATUS_F[
                                order.paymentStatus
                            ].label
                            : order.paymentStatus || "",
                        ORDER_STATUS_F[
                            order.orderStatus
                        ]
                            ? ORDER_STATUS_F[
                                order.orderStatus
                            ].label
                            : order.orderStatus || ""
                    ]
                );

            }
        );


        var csv =
            rows.map(
                function (row) {

                    return row
                        .map(
                            function (cell) {

                                return (
                                    '"' +
                                    String(cell)
                                        .replace(
                                            /"/g,
                                            '""'
                                        ) +
                                    '"'
                                );

                            }
                        )
                        .join(",");

                }
            )
            .join("\n");


        var blob =
            new Blob(
                ["\uFEFF" + csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        var url =
            URL.createObjectURL(blob);


        var link =
            document.createElement("a");


        link.href = url;

        link.download =
            "orders-export.csv";


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);


        showToastF(
            "خروجی سفارش‌ها دانلود شد.",
            "success"
        );

    }


    /* ============================================================
     * DETAILS SHEET
     * ============================================================ */

    function renderDetailsSheetF(order) {

        var totals =
            orderTotalsF(order);


        var currencyLabel =
            EXCHANGE_RATES_F[
                order.currency
            ].label;


        document.getElementById(
            "adminSheetTitleF"
        ).textContent =
            "سفارش " +
            order.number;


        document.getElementById(
            "adminSheetBasicF"
        ).innerHTML =

            sheetRowF(
                "شماره سفارش",
                order.number
            )

            +

            sheetRowF(
                "تاریخ ثبت",
                order.date
            )

            +

            sheetRowF(
                "تاریخ آخرین تغییر",
                order.lastChangeDate
            )

            +

            sheetRowF(
                "وضعیت سفارش",
                badgeHtmlF(
                    ORDER_STATUS_F,
                    order.orderStatus
                )
            )

            +

            sheetRowF(
                "وضعیت فاکتور",
                badgeHtmlF(
                    INVOICE_STATUS_F,
                    order.invoiceStatus
                )
            );

        document.getElementById(
            "adminSheetCustomerF"
        ).innerHTML =

            sheetRowF(
                "نام و نام خانوادگی",
                order.customer.name
            )

            +

            sheetRowF(
                "شماره تماس",
                '<span dir="ltr">' +
                order.customer.phone +
                "</span>"
            )

            +

            sheetRowF(
                "آدرس",
                order.customer.address
            )

            +

            (
                order.customer.note
                    ?
                    sheetRowF(
                        "اطلاعات تکمیلی",
                        order.customer.note
                    )
                    :
                    ""
            );


        document.getElementById(
            "adminSheetProductsF"
        ).innerHTML =
            order.products
                .map(
                    function (product) {

                        var price =
                            unitPriceF(product);

                        return (
                            '<div class="admin-orders-f__sheet-product">' +

                            "<div>" +

                            '<p class="admin-orders-f__sheet-product-name">' +
                            product.name +
                            "</p>" +

                                                                                    '<p class="admin-orders-f__sheet-product-meta">' +
                            "برند: " +
                            (product.brand || "—") +
                            "</p>" +

                            '<p class="admin-orders-f__sheet-product-meta">' +
                            "سایز: " +
                            (product.size || "—") +
                            "</p>" +

                            '<p class="admin-orders-f__sheet-product-meta">' +
                            "تعداد: " +
                            formatNumberF(
                                product.qty
                            ) +
                            "</p>" +

                            '<p class="admin-orders-f__sheet-product-meta">' +
                            "قیمت واحد: " +
                            formatNumberF(
                                price
                            ) +
                            " " +
                            currencyLabel +
                            "</p>" +

                            '<p class="admin-orders-f__sheet-product-meta">' +
                            "توضیحات: " +
                            (product.description || "—") +
                            "</p>" +
                            "</div>" +

                            "<span>" +
                            formatNumberF(
                                price *
                                product.qty *
                                totals.rate
                            ) +
                            " ریال</span>" +

                            "</div>"
                        );
                    }
                )
                .join("")

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>مبلغ کل محصولات</span>" +

            "<span>" +

            formatNumberF(
                totals.productsRial
            ) +

            " ریال</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>هزینه باربری</span>" +

            "<span>" +

            (
                order.shippingRial
                    ?
                    formatNumberF(
                        order.shippingRial
                    ) +
                    " ریال"
                    :
                    "رایگان"
            ) +

            "</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>هزینه خدمات</span>" +

            "<span>" +

            (
                order.serviceRial
                    ?
                    formatNumberF(
                        order.serviceRial
                    ) +
                    " ریال"
                    :
                    "رایگان"
            ) +

            "</span>" +

            "</div>";

            document.getElementById(
                "adminSheetFinancialF"
            ).innerHTML =

            sheetRowF(
                "مبلغ به ارز مبنا",
                formatNumberF(
                    totals.baseAmount
                ) +
                " " +
                currencyLabel
            )

            +

            sheetRowF(
                "نوع ارز",
                currencyLabel
            )

            +

            sheetRowF(
                "نرخ تبدیل ارز",
                formatNumberF(
                    totals.rate
                ) +
                " ریال"
            )

            +

            sheetRowF(
                "مبلغ ریالی",
                formatNumberF(
                    totals.totalRial
                ) +
                " ریال"
            )

            +

            sheetRowF(
                "مبلغ پرداخت‌شده",
                order.payment.paidRial === null
                    ?
                    formatNumberF(
                        totals.totalRial
                    ) +
                    " ریال"
                    :
                    formatNumberF(
                        order.payment.paidRial
                    ) +
                    " ریال"
            )

            +

            sheetRowF(
                "مبلغ باقی‌مانده",
                order.payment.remainingRial === null
                    ?
                    formatNumberF(
                        totals.totalRial -
                        (order.payment.paidRial || 0)
                    ) +
                    " ریال"
                    :
                    formatNumberF(
                        order.payment.remainingRial
                    ) +
                    " ریال"
            );


        document.getElementById(
            "adminSheetPaymentF"
        ).innerHTML =

            sheetRowF(
                "وضعیت پرداخت",
                badgeHtmlF(
                    PAYMENT_STATUS_F,
                    order.paymentStatus
                )
            )

            +

            sheetRowF(
                "روش پرداخت",
                order.payment.method
            )

            +

            sheetRowF(
                "کد پیگیری",
                '<span dir="ltr">' +
                order.payment.trackingCode +
                "</span>"
            )

            +

            sheetRowF(
                "تاریخ پرداخت",
                order.payment.paidDate
            );


        var statusSelect =
            document.getElementById(
                "adminSheetStatusSelectF"
            );


        if (statusSelect) {

            statusSelect.value =
                order.orderStatus;

        }

    }


    /* ============================================================
     * PDF BACKEND HOOK
     * ============================================================ */

    function invoiceApiEndpointF(
        orderNumber
    ) {

        return (
            "/api/orders/" +
            encodeURIComponent(
                orderNumber
            ) +
            "/invoice"
        );

    }


    function fetchInvoicePdfBlobF(
        orderNumber
    ) {
        return fetch(invoiceApiEndpointF(orderNumber), {
            method: "GET",
            credentials: "same-origin",
            headers: { "Accept": "application/pdf" }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("invoice_backend_not_connected");
            }
            var contentType = response.headers.get("content-type") || "";
            if (contentType.indexOf("application/pdf") === -1) {
                throw new Error("invoice_backend_invalid_pdf");
            }
            return response.blob();
        });
    }


    function downloadOrderF(
        orderNumber
    ) {
        var order = findOrderByNumberF(orderNumber);

        if (!order) {
            showToastF("سفارش پیدا نشد.", "error");
            return;
        }

        var triggers = document.querySelectorAll(
            '[data-download-order-f="' + orderNumber + '"]'
        );

        triggers.forEach(function (button) {
            button.setAttribute("aria-busy", "true");
            button.disabled = true;
        });

        showToastF("در حال آماده‌سازی PDF سفارش " + orderNumber + "…", null);

        fetchInvoicePdfBlobF(orderNumber)
            .then(function (blob) {
                var url = URL.createObjectURL(blob);
                var link = document.createElement("a");
                link.href = url;
                link.download = "invoice-" + orderNumber + ".pdf";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showToastF("فایل PDF سفارش " + orderNumber + " دانلود شد.", "success");
            })
            .catch(function () {
                // The browser print engine is the fallback when the Django
                // PDF endpoint is not ready. It prints the exact same DOM
                // and styling that is visible in the invoice modal.
                var invoice = document.getElementById("adminCustomerInvoiceF");
                if (!invoice) {
                    showToastF("نمایش فاکتور پیدا نشد.", "error");
                    return;
                }
                printInvoiceF("adminCustomerInvoiceF", true);
            })
            .finally(function () {
                triggers.forEach(function (button) {
                    button.removeAttribute("aria-busy");
                    button.disabled = false;
                });
            });
    }


    /* ============================================================
     * DETAILS MODAL INIT
     * ============================================================ */

    var openDetailsSheetF;


    function initDetailsSheetF() {

        var modal =
            document.getElementById(
                "adminOrderDetailsModalF"
            );


        var closeBtn =
            document.getElementById(
                "adminSheetCloseF"
            );


        var downloadBtn =
            document.getElementById(
                "adminSheetDownloadF"
            );


        var editBtn =
            document.getElementById(
                "adminSheetEditF"
            );


        var statusBtn =
            document.getElementById(
                "adminSheetStatusBtnF"
            );


        var statusSelect =
            document.getElementById(
                "adminSheetStatusSelectF"
            );


        if (!modal) {
            return;
        }


        var activeOrderNumber =
            null;


        openDetailsSheetF =
            function (orderNumber) {

                var order =
                    ordersF.filter(
                        function (item) {

                            return (
                                item.number ===
                                orderNumber
                            );

                        }
                    )[0];


                if (!order) {
                    return;
                }


                activeOrderNumber =
                    orderNumber;


                renderDetailsSheetF(
                    order
                );


                modal.hidden =
                    false;

            };


        function closeModal() {

            modal.hidden =
                true;

            activeOrderNumber =
                null;

        }


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeModal
            );

        }


        var backdrop =
            modal.querySelector(
                ".modal__backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeModal
            );

        }


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    !modal.hidden
                ) {

                    closeModal();

                }

            }
        );


        if (downloadBtn) {

            downloadBtn.addEventListener(
                "click",
                function () {

                    if (
                        activeOrderNumber
                    ) {

                        downloadOrderF(
                            activeOrderNumber
                        );

                    }

                }
            );

        }


        if (editBtn) {

            editBtn.addEventListener(
                "click",
                function () {

                    if (
                        !activeOrderNumber
                    ) {
                        return;
                    }


                    var order =
                        findOrderByNumberF(
                            activeOrderNumber
                        );


                    if (!order) {

                        showToastF(
                            "سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    if (
                        !openEditOrderModalF
                    ) {
                        return;
                    }


                    closeModal();


                    openEditOrderModalF(
                        order
                    );

                }
            );

        }


        if (statusBtn) {

            statusBtn.addEventListener(
                "click",
                function () {

                    if (!activeOrderNumber) {
                        return;
                    }

                    showToastF(
                        "تغییر وضعیت سفارش هنوز به بک‌اند متصل نشده است.",
                        "error"
                    );

                }
            );

        }



    }


    /* ============================================================
     * MENUS + GLOBAL ACTIONS
     * ============================================================ */

    function closeAllMenusF() {

        document
            .querySelectorAll(
                "[data-more-menu-panel-f]"
            )
            .forEach(
                function (panel) {

                    panel.hidden =
                        true;

                }
            );


        document
            .querySelectorAll(
                "[data-more-menu-btn-f]"
            )
            .forEach(
                function (button) {

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

    }


    function initGlobalActionsF() {

        document.addEventListener(
            "click",
            function (event) {


                var moreBtn =
                    event.target.closest(
                        "[data-more-menu-btn-f]"
                    );


                if (moreBtn) {

                    var orderNumber =
                        moreBtn.getAttribute(
                            "data-more-menu-btn-f"
                        );


                    var panel =
                        document.querySelector(
                            '[data-more-menu-panel-f="' +
                            orderNumber +
                            '"]'
                        );


                    if (!panel) {
                        return;
                    }


                    var wasHidden =
                        panel.hidden;


                    closeAllMenusF();


                    panel.hidden =
                        !wasHidden;


                    moreBtn.setAttribute(
                        "aria-expanded",
                        String(!wasHidden)
                    );


                    return;

                }


                var downloadTrigger =
                    event.target.closest(
                        "[data-download-order-f]"
                    );


                if (downloadTrigger) {

                    downloadOrderF(
                        downloadTrigger.getAttribute(
                            "data-download-order-f"
                        )
                    );


                    closeAllMenusF();

                    return;

                }


                var editTrigger =
                    event.target.closest(
                        "[data-edit-order-f]"
                    );


                if (editTrigger) {

                    var orderNumber =
                        editTrigger.getAttribute(
                            "data-edit-order-f"
                        );


                    var order =
                        findOrderByNumberF(
                            orderNumber
                        );


                    closeAllMenusF();


                    if (!order) {

                        showToastF(
                            "سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    if (
                        openEditOrderModalF
                    ) {

                        openEditOrderModalF(
                            order
                        );
                    }


                    return;
                }


                var resendTrigger =
                    event.target.closest(
                        "[data-resend-invoice-f]"
                    );


                if (resendTrigger) {

                    showToastF(
                        "ارسال مجدد فاکتور هنوز به بک‌اند متصل نشده است.",
                        "error"
                    );


                    closeAllMenusF();

                    return;

                }


                var deleteTrigger =
                    event.target.closest(
                        "[data-delete-order-f]"
                    );


                if (deleteTrigger) {

                    var orderNumber =
                        deleteTrigger.getAttribute(
                            "data-delete-order-f"
                        );


                    var order =
                        findOrderByNumberF(
                            orderNumber
                        );


                    closeAllMenusF();


                    if (!order) {

                        showToastF(
                            "سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    var confirmed =
                        window.confirm(
                            "آیا از حذف کامل سفارش " +
                            order.number +
                            " مطمئن هستید؟\n" +
                            "این عملیات قابل بازگشت نیست."
                        );


                    if (!confirmed) {
                        return;
                    }


                    var form =
                        document.getElementById(
                            "adminNewOrderFormF"
                        );


                    if (!form) {

                        showToastF(
                            "فرم سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    var deleteUrl =
                        buildOrderUrlF(
                            form.dataset
                                .deleteUrlTemplate,
                            order.id
                        );


                    var formData =
                        new FormData();


                    formData.append(
                        "csrfmiddlewaretoken",
                        getCsrfTokenF()
                    );


                    fetchJsonF(
                        deleteUrl,
                        {
                            method: "POST",
                            body: formData
                        }
                    )

                    .then(function () {

                        // فقط بعد از حذف موفق در Django
                        // از لیست مرورگر هم حذف می‌کنیم.
                        ordersF =
                            ordersF.filter(
                                function (item) {

                                    return (
                                        Number(item.id) !==
                                        Number(order.id)
                                    );

                                }
                            );


                        applyFiltersF();


                        showToastF(
                            "سفارش " +
                            order.number +
                            " با موفقیت حذف شد.",
                            "success"
                        );

                    })

                    .catch(function (error) {

                        console.error(
                            "Delete order error:",
                            error
                        );


                        showToastF(
                            error.message ||
                            "حذف سفارش انجام نشد.",
                            "error"
                        );

                    });


                    return;
                }


                var viewTrigger =
                    event.target.closest(
                        "[data-view-order-f]"
                    );


                if (viewTrigger) {

                    if (openDetailsSheetF) {

                        openDetailsSheetF(
                            viewTrigger.getAttribute(
                                "data-view-order-f"
                            )
                        );

                    }


                    closeAllMenusF();

                    return;

                }


                var row =
                    event.target.closest(
                        "[data-order-row-f]"
                    );


                if (
                    row &&
                    !event.target.closest(
                        ".admin-menu-f"
                    ) &&
                    !event.target.closest(
                        "button"
                    )
                ) {

                    if (openDetailsSheetF) {

                        openDetailsSheetF(
                            row.getAttribute(
                                "data-order-row-f"
                            )
                        );

                    }

                    return;

                }


                if (
                    !event.target.closest(
                        ".admin-menu-f"
                    )
                ) {

                    closeAllMenusF();

                }

            }
        );

    }


    /* ============================================================
     * NEW ORDER
     * ============================================================ */

    /* ----------------------------------------------------------
     * Item rows (image upload, price+currency, qty stepper,
     * remove) — cloned from <template id="adminOrderItemTemplateF">
     * ---------------------------------------------------------- */

    function createOrderItemRowF(
        product
    ) {

        var template =
            document.getElementById(
                "adminOrderItemTemplateF"
            );


        if (!template) {
            return null;
        }


        var row =
            template
                .content
                .firstElementChild
                .cloneNode(true);


        var removeBtn =
            row.querySelector(
                ".admin-order-item-f__remove"
            );


        var fileInput =
            row.querySelector(
                ".admin-order-item-f__file-input"
            );


        var preview =
            row.querySelector(
                ".admin-order-item-f__preview"
            );


        var nameInput =
            row.querySelector(
                ".admin-order-item-f__name"
            );


        var priceInput =
            row.querySelector(
                ".admin-order-item-f__price"
            );


        var currencyInput =
            row.querySelector(
                ".admin-order-item-f__currency"
            );


        var brandInput =
            row.querySelector(
                ".admin-order-item-f__brand"
            );


        var sizeInput =
            row.querySelector(
                ".admin-order-item-f__size"
            );


        var descriptionInput =
            row.querySelector(
                ".admin-order-item-f__description"
            );


        var qtyInput =
            row.querySelector(
                ".admin-order-item-f__qty"
            );


        if (removeBtn) {

            removeBtn.addEventListener(
                "click",
                function () {

                    row.remove();

                }
            );
        }


        if (fileInput) {

            fileInput.addEventListener(
                "change",
                function () {

                    var file =
                        fileInput.files[0];


                    if (!file) {
                        return;
                    }


                    var reader =
                        new FileReader();


                    reader.onload =
                        function () {

                            preview.src =
                                reader.result;

                            preview.hidden =
                                false;

                        };


                    reader.readAsDataURL(
                        file
                    );

                }
            );
        }


        row.querySelectorAll(
            "[data-qty-action]"
        )
        .forEach(
            function (btn) {

                btn.addEventListener(
                    "click",
                    function () {

                        var current =
                            Number(
                                qtyInput.value
                            ) || 1;


                        var next =
                            btn.dataset.qtyAction ===
                            "increase"
                                ?
                                current + 1
                                :
                                current - 1;


                        qtyInput.value =
                            Math.max(
                                1,
                                next
                            );

                    }
                );

            }
        );


        // اگر در حالت ویرایش هستیم
        if (product) {

            if (product.id) {

                row.dataset.itemId =
                    String(
                        product.id
                    );
            }


            if (nameInput) {

                nameInput.value =
                    product.name || "";
            }


            if (priceInput) {

                priceInput.value =
                    unitPriceF(
                        product
                    );
            }


            if (currencyInput) {

                currencyInput.value =
                    product.currency ||
                    "USD";
            }


            if (brandInput) {

                brandInput.value =
                    product.brand || "";
            }


            if (sizeInput) {

                sizeInput.value =
                    product.size || "";
            }


            if (descriptionInput) {

                descriptionInput.value =
                    product.description || "";
            }


            if (qtyInput) {

                qtyInput.value =
                    Number(
                        product.qty
                    ) || 1;
            }


            if (
                preview &&
                product.image
            ) {

                preview.src =
                    product.image;

                preview.hidden =
                    false;
            }
        }


        return row;
    }


    function resetOrderItemsF() {

        var container =
            document.getElementById(
                "adminOrderItemsF"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        var firstRow = createOrderItemRowF();

        if (firstRow) {
            container.appendChild(firstRow);
        }

    }


    function initOrderItemsF() {

        var addBtn =
            document.getElementById(
                "adminAddOrderItemF"
            );

        var container =
            document.getElementById(
                "adminOrderItemsF"
            );

        if (!addBtn || !container) {
            return;
        }

        addBtn.addEventListener(
            "click",
            function () {

                var row = createOrderItemRowF();

                if (row) {
                    container.appendChild(row);
                }

            }
        );

    }


    // Reads + validates every item row. Returns { items, error }
    // — items is null when validation fails, with error set to a
    // user-facing message.




    function readOrderItemsF() {

        var container =
            document.getElementById(
                "adminOrderItemsF"
            );

        if (!container) {
            return {
                items: null,
                error: "خطای داخلی فرم."
            };
        }

        var rows =
            container.querySelectorAll(
                ".admin-order-item-f"
            );

        if (!rows.length) {
            return {
                items: null,
                error: "حداقل یک آیتم به سفارش اضافه کنید."
            };
        }

        var items = [];
        var error = null;

        rows.forEach(function (row) {

            if (error) {
                return;
            }

            var nameInput =
                row.querySelector(
                    ".admin-order-item-f__name"
                );

            var priceInput =
                row.querySelector(
                    ".admin-order-item-f__price"
                );

            var currencyInput =
                row.querySelector(
                    ".admin-order-item-f__currency"
                );

            var brandInput =
                row.querySelector(
                    ".admin-order-item-f__brand"
                );

            var sizeInput =
                row.querySelector(
                    ".admin-order-item-f__size"
                );

            var descriptionInput =
                row.querySelector(
                    ".admin-order-item-f__description"
                );

            var qtyInput =
                row.querySelector(
                    ".admin-order-item-f__qty"
                );

            var preview =
                row.querySelector(
                    ".admin-order-item-f__preview"
                );

            var fileInput =
                row.querySelector(
                    ".admin-order-item-f__file-input"
                );

            var name =
                nameInput
                    ? nameInput.value.trim()
                    : "";

            var price =
                priceInput
                    ? Number(priceInput.value)
                    : 0;

            var currency =
                currencyInput
                    ? currencyInput.value
                    : "";

            var brand =
                brandInput
                    ? brandInput.value.trim()
                    : "";

            var size =
                sizeInput
                    ? sizeInput.value.trim()
                    : "";

            var description =
                descriptionInput
                    ? descriptionInput.value.trim()
                    : "";

            var qty =
                qtyInput
                    ? Number(qtyInput.value)
                    : 0;

            var image =
                preview &&
                !preview.hidden
                    ? preview.src
                    : "";

            var file =
                fileInput &&
                fileInput.files &&
                fileInput.files.length
                    ? fileInput.files[0]
                    : null;

            if (
                !name ||
                !price ||
                price <= 0 ||
                !qty ||
                qty < 1
            ) {

                error =
                    "برای هر آیتم، نام و قیمت معتبر و حداقل ۱ عدد تعداد وارد کنید.";

                return;
            }
            var itemId =
                row.dataset.itemId
                    ?
                    Number(
                        row.dataset.itemId
                    )
                    :
                    null;
            items.push({

                id:
                    itemId,

                name:
                    name,

                price:
                    price,

                currency:
                    currency,

                brand:
                    brand,

                size:
                    size,

                description:
                    description,

                qty:
                    qty,

                image:
                    image,

                file:
                    file

            });

        });

        return {
            items: error ? null : items,
            error: error
        };
    }





















    /* ----------------------------------------------------------
     * Exchange rate "fetch"
     *
     * Temporary local exchange-rate source.
     * Replace the body of this function with a real backend/API
     * request when the exchange-rate endpoint is implemented.
     * Keep the same resolved shape
     * ({ USD: { label, rate }, ... }).
     * ---------------------------------------------------------- */

    function fetchExchangeRatesF() {

        return new Promise(function (resolve) {

            setTimeout(function () {
                resolve(EXCHANGE_RATES_F);
            }, 700);

        });

    }


    /* ----------------------------------------------------------
     * Invoice calculation
     * ---------------------------------------------------------- */

    function buildInvoiceCalcF(items, rates, shippingRial, serviceRial) {

        // Per-currency subtotal in that currency's own units —
        // covers orders that mix currencies across items.
        var byCurrency = {};

        var itemsRial = 0;

        var lines = items.map(function (item) {

            var rate =
                rates[item.currency]
                    ? rates[item.currency].rate
                    : 0;

            // In the SANAA reference invoice, the stored `price` is the
            // amount printed in the "قیمت واحد" column and is already the
            // invoice line amount. Quantity is displayed separately and is
            // not multiplied into the invoice subtotal.
            var lineForeign = item.price;
            var lineRial = lineForeign * rate;

            itemsRial += lineRial;

            byCurrency[item.currency] =
                (byCurrency[item.currency] || 0) + lineForeign;

            return {
                name: item.name,
                brand: item.brand,
                size: item.size,
                description: item.description,
                image: item.image,
                qty: item.qty,
                currency: item.currency,
                price: item.price,
                lineForeign: lineForeign,
                lineRial: lineRial,
                rate: rate
            };

        });

        var grandTotalRial =
            itemsRial + shippingRial + serviceRial;

        return {
            lines: lines,
            byCurrency: byCurrency,
            itemsRial: itemsRial,
            shippingRial: shippingRial,
            serviceRial: serviceRial,
            grandTotalRial: grandTotalRial,

            // Admin cost is no longer collected on the frontend —
            // profit is now the backend's responsibility. Replace
            // this with the real figure from the create/update
            // order response once that field exists there.
            profitRial: 0
        };

    }


    /* ----------------------------------------------------------
     * Invoice rendering — one shared layout, two content sets
     * (the admin version adds the profit block).
     * ---------------------------------------------------------- */

    function toPersianDigitsF(value) {

        var map = {
            "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
            "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹"
        };

        return String(value == null ? "" : value).replace(
            /[0-9]/g,
            function (digit) {
                return map[digit];
            }
        );

    }


    function renderInvoiceHtmlF(calc, meta, isAdminF) {

        var itemRows = calc.lines.map(function (line) {

            var currencyLabel =
                EXCHANGE_RATES_F[line.currency]
                    ? EXCHANGE_RATES_F[line.currency].label
                    : line.currency;

            var rialCell =
                "<td class=\"invoice-price\">" +
                formatNumberF(line.lineRial) + " ریال</td>";

            var foreignCell =
                isAdminF
                    ? "<td class=\"invoice-price\">" +
                      toPersianDigitsF(line.price) + " " + currencyLabel +
                      "</td>"
                    : "";

            return (
                "<tr>" +
                "<td class=\"invoice-item-name\">" + (line.name || "—") + "</td>" +
                "<td>" + (line.brand || "—") + "</td>" +
                "<td>" + (line.size || "—") + "</td>" +
                "<td>" + toPersianDigitsF(line.qty || 0) + "</td>" +
                foreignCell +
                rialCell +
                "</tr>"
            );
        }).join("");


        var profitBlock = "";
        if (isAdminF) {
            profitBlock =
                '<div class="invoice-profit-f">' +
                    '<div class="invoice-profit-title-f">فاکتور داخلی — فقط ادمین</div>' +
                    '<div class="invoice-summary-row-f">' +
                        '<span>سود ادمین این سفارش</span>' +
                        '<strong>' + formatNumberF(calc.profitRial) + ' ریال</strong>' +
                    '</div>' +
                '</div>';
        }


        // Rate at the moment the order was placed — admin only,
        // shown on the right meta column (under payment status).
        // Uses the first item's currency as the primary one for
        // mixed-currency orders.
        var rateLineHtml = "";

        if (isAdminF && calc.lines.length) {

            var primaryLine = calc.lines[0];

            var primaryCurrencyLabel =
                EXCHANGE_RATES_F[primaryLine.currency]
                    ? EXCHANGE_RATES_F[primaryLine.currency].label
                    : primaryLine.currency;

            rateLineHtml =
                "<p><span>نرخ " + primaryCurrencyLabel +
                " (لحظه ثبت سفارش) :</span> " +
                formatNumberF(primaryLine.rate) + " ریال</p>";

        }


        var tableHeadHtml =
            isAdminF
                ? '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>تعداد</th><th>قیمت واحد (ارز)</th><th>قیمت واحد (ریال)</th></tr>'
                : '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>تعداد</th><th>قیمت واحد</th></tr>';


        var colWidthsCss =
            isAdminF
                ? ".admin-invoice-f__table th:nth-child(1){width:22%;}.admin-invoice-f__table th:nth-child(2){width:14%;}.admin-invoice-f__table th:nth-child(3){width:11%;}.admin-invoice-f__table th:nth-child(4){width:11%;}.admin-invoice-f__table th:nth-child(5){width:20%;}.admin-invoice-f__table th:nth-child(6){width:22%;}"
                : ".admin-invoice-f__table th:nth-child(1){width:27%;}.admin-invoice-f__table th:nth-child(2){width:17%;}.admin-invoice-f__table th:nth-child(3){width:13%;}.admin-invoice-f__table th:nth-child(4){width:13%;}.admin-invoice-f__table th:nth-child(5){width:30%;}";


        return (
            "<style id=\"admin-invoice-reference-style-f\">\n.invoice-scale-wrap-f{width:100%;overflow:hidden;display:flex;justify-content:center;align-items:flex-start;}\n.admin-invoice-f{flex:0 0 auto;transform-origin:top center;width:640px;min-height:980px;margin:0 auto;background:#F3EFE8;color:#201B1D;direction:rtl;overflow:hidden;font-family:'Sanaa Persian',Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}\n.admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;font-variant-numeric:tabular-nums;}\n.admin-invoice-f__band{height:200px;min-height:200px;padding:26px 24px 16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:#B9C3B9;text-align:center;}\n.admin-invoice-f__band-logo{font-family:'Belleza',Georgia,serif;font-size:56px;line-height:1;color:#A61579;letter-spacing:.16em;font-weight:400;}\n.admin-invoice-f__band-sub{margin-top:8px;font-family:'Belleza',Georgia,serif;font-size:19px;line-height:1;color:#A61579;letter-spacing:.34em;font-weight:400;}\n.admin-invoice-f__band-type-f{margin-top:10px;font-size:12px;color:#5C5356;font-weight:700;}\n.admin-invoice-f__card{width:90%;min-height:720px;margin:-50px auto 0;background:#fff;padding:0 18px 36px;box-shadow:0 0 0 1px rgba(0,0,0,.02);page-break-inside:avoid;}\n.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;align-items:start;gap:30px;border-bottom:1px solid #4B4748;font-size:15px;line-height:1.8;}\n.admin-invoice-f__meta-col{display:flex;flex-direction:column;gap:0;min-width:0;}\n.admin-invoice-f__meta-col--left{text-align:left;}\n.admin-invoice-f__meta-col p{margin:0;white-space:nowrap;overflow-wrap:anywhere;}\n.admin-invoice-f__table{width:100%;margin:30px 0 0;border-collapse:collapse;table-layout:fixed;font-size:14px;}\n.admin-invoice-f__table th{height:44px;padding:6px 7px;background:#A61579;color:#fff;border-left:2px solid #fff;font-size:13px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;line-height:1.2;}\n" +
            colWidthsCss +
            "\n.admin-invoice-f__table th:last-child{border-left:0;}\n.admin-invoice-f__table td{min-height:62px;height:62px;padding:8px 7px;border:0;text-align:center;vertical-align:middle;font-size:14px;overflow-wrap:anywhere;word-break:break-word;}\n.admin-invoice-f__table td.invoice-item-name{text-align:right;}\n.admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__summary-wrap{margin-top:42px;display:flex;flex-direction:column;align-items:flex-end;}\n.admin-invoice-f__summary{width:315px;max-width:none;margin-right:0;display:flex;flex-direction:column;gap:6px;}\n.invoice-summary-row-f{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:15px;line-height:1.65;direction:rtl;}\n.invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;text-align:left;}\n.invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:18px;font-weight:700;}\n.invoice-summary-total-f strong:first-child{font-weight:800;}\n.invoice-profit-f{width:315px;max-width:none;margin:22px auto 0 0;padding:10px 12px;border:1px dashed #A61579;background:#FBF2F8;}\n.invoice-profit-title-f{margin-bottom:7px;color:#A61579;font-size:11px;font-weight:700;}\n.admin-invoice-f__footer{width:90%;margin:0 auto;min-height:120px;padding:28px 0 0;display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-wrap:nowrap;gap:30px;background:#F3EFE8;color:#A61579;}\n.admin-invoice-f__contact-f{flex:0 1 auto;min-width:0;font-family:Arial,Tahoma,sans-serif;font-size:14px;line-height:1.7;text-align:left;}\n.admin-invoice-f__contact-f p{margin:0;overflow-wrap:anywhere;}\n.admin-invoice-f__thanks-f{flex:0 1 auto;min-width:0;margin:0;font-size:22px;font-weight:700;text-align:right;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__footer-note{display:none;}\n</style>" +
            '<div class="invoice-scale-wrap-f">' +
            '<div class="admin-invoice-f" dir="rtl">' +
                '<div class="admin-invoice-f__band">' +
                    '<span class="admin-invoice-f__band-logo" dir="ltr">SANAA</span>' +
                    '<span class="admin-invoice-f__band-sub" dir="ltr">ONLINE SHOP</span>' +
                    (isAdminF ? '<span class="admin-invoice-f__band-type-f">فاکتور داخلی — فقط ادمین</span>' : '') +
                '</div>' +
                '<div class="admin-invoice-f__card">' +
                    '<div class="admin-invoice-f__meta">' +
                        '<div class="admin-invoice-f__meta-col">' +
                            '<p><span>مشتری :</span> ' + toPersianDigitsF(meta.customerName || "—") + '</p>' +
                            '<p><span>وضعیت پرداخت :</span> ' + (meta.paymentLabel || "—") + '</p>' +
                            rateLineHtml +
                        '</div>' +
                        '<div class="admin-invoice-f__meta-col admin-invoice-f__meta-col--left">' +
                            '<p><span>شماره سفارش :</span> ' + toPersianDigitsF(meta.orderNumber || "—") + '</p>' +
                            '<p><span>تاریخ صدور :</span> ' + toPersianDigitsF(meta.date || "—") + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<table class="admin-invoice-f__table">' +
                        '<thead>' + tableHeadHtml + '</thead>' +
                        '<tbody>' + itemRows + '</tbody>' +
                    '</table>' +
                    '<div class="admin-invoice-f__summary-wrap">' +
                        '<div class="admin-invoice-f__summary">' +
                            '<div class="invoice-summary-row-f"><span>جمع کل :</span><span>' + formatNumberF(calc.itemsRial) + ' ریال</span></div>' +
                            '<div class="invoice-summary-row-f"><span>هزینه خدمات :</span><span>' + formatNumberF(calc.serviceRial) + ' ریال</span></div>' +
                            '<div class="invoice-summary-row-f"><span>هزینه باربری :</span><span>' + formatNumberF(calc.shippingRial) + ' ریال</span></div>' +
                            '<div class="invoice-summary-row-f invoice-summary-total-f"><strong>مجموع کل</strong><strong>' + formatNumberF(calc.grandTotalRial) + ' ریال</strong></div>' +
                        '</div>' +
                        profitBlock +
                    '</div>' +
                '</div>' +
                '<div class="admin-invoice-f__footer">' +
                '<p class="admin-invoice-f__thanks-f">با تشکر از خرید شما</p>' +
                    '<div class="admin-invoice-f__contact-f" dir="ltr">' +
                        '<p>instagram : sanaa.onlineshop</p>' +
                        '<p>phone: +98 915 579 3189</p>' +
                        '<p>website : sanaaonlineshop.com</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '</div>'
        );
    }


    /* ----------------------------------------------------------
     * Invoice modals — open/close/navigate/print
     * ---------------------------------------------------------- */

    function fitInvoiceWrapF(wrap) {

        var invoice = wrap.querySelector(".admin-invoice-f");

        if (!invoice) {
            return;
        }

        invoice.style.transform = "none";

        var naturalWidth = invoice.offsetWidth;
        var naturalHeight = invoice.offsetHeight;
        var availableWidth = wrap.clientWidth;

        var scale =
            availableWidth > 0 && naturalWidth > 0
                ? Math.min(1, availableWidth / naturalWidth)
                : 1;

        invoice.style.transform = "scale(" + scale + ")";
        wrap.style.height = (naturalHeight * scale) + "px";

    }


    function fitInvoicesInModalF(modal) {

        if (!modal) {
            return;
        }

        modal.querySelectorAll(".invoice-scale-wrap-f").forEach(fitInvoiceWrapF);

    }


    window.addEventListener("resize", function () {

        document.querySelectorAll(".invoice-scale-wrap-f").forEach(function (wrap) {

            if (wrap.offsetParent !== null) {
                fitInvoiceWrapF(wrap);
            }

        });

    });


    function openInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (modal) {

            modal.hidden = false;

            requestAnimationFrame(function () {
                fitInvoicesInModalF(modal);
            });

        }

    }


    function closeInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (modal) {
            modal.hidden = true;
        }

    }


    /* ----------------------------------------------------------
     * Printing — instead of hiding the rest of the admin page
     * with CSS (fragile across this page's nested layout/scroll
     * containers and produced blank PDFs), open the invoice
     * markup alone in a fresh window with just the site
     * stylesheet, then print that. Much more reliable.
     * ---------------------------------------------------------- */

    function printInvoiceF(containerId, fromDownloadF) {
        var content = document.getElementById(containerId);
        if (!content) {
            return;
        }

        var printContent = content.cloneNode(true);

        var scaledInvoice = printContent.querySelector(".admin-invoice-f");
        if (scaledInvoice) {
            scaledInvoice.style.transform = "none";
        }

        var scaleWrap = printContent.querySelector(".invoice-scale-wrap-f");
        if (scaleWrap) {
            scaleWrap.style.height = "auto";
        }

        var fonts = window.SANAA_FONTS_F || {};
        function absoluteUrlF(path) {
            return path ? window.location.origin + path : "";
        }

        var fontFaces =
            "@font-face{font-family:'Belleza';src:url('" + absoluteUrlF(fonts.belleza) + "') format('woff2');font-weight:400;font-display:block;}" +
            "@font-face{font-family:'Sanaa Persian';src:url('" + absoluteUrlF(fonts.vazirRegular) + "') format('truetype');font-weight:400;font-display:block;}" +
            "@font-face{font-family:'Sanaa Persian';src:url('" + absoluteUrlF(fonts.vazirMedium) + "') format('truetype');font-weight:500;font-display:block;}" +
            "@font-face{font-family:'Sanaa Persian';src:url('" + absoluteUrlF(fonts.vazirBold) + "') format('truetype');font-weight:700;font-display:block;}";

        var printCss = fontFaces +
            "html,body{margin:0;padding:0;background:#ffffff;}" +
            "body{font-family:'Sanaa Persian',Tahoma,Arial,sans-serif;color:#201B1D;-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
            ".admin-invoice-f{width:100%;max-width:640px;min-height:0;margin:0 auto;background:#F3EFE8;overflow:hidden;direction:rtl;}" +
            ".admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;}" +
            ".admin-invoice-f__band{min-height:200px;padding:30px 16px 20px;display:flex;flex-direction:column;align-items:center;background:#B9C3B9;text-align:center;}" +//header
            ".admin-invoice-f__band-logo{font-family:'Belleza',Georgia,serif;font-size:46px;line-height:1;color:#A61579;letter-spacing:.13em;}" +
            ".admin-invoice-f__band-sub{margin-top:7px;font-family:'Belleza',Georgia,serif;font-size:16px;line-height:1;color:#A61579;letter-spacing:.25em;}" +
            ".admin-invoice-f__band-type-f{margin-top:10px;font-size:11px;color:#5C5356;font-weight:700;}" +
            ".admin-invoice-f__card{width:90%;min-height:0;margin:-50px auto 0;background:#fff;padding:0 12px 28px;page-break-inside:avoid;}" +
            ".admin-invoice-f__meta{min-height:0;padding:14px 0 13px;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid #4B4748;font-size:12px;line-height:1.9;}" +
            ".admin-invoice-f__meta-col{display:flex;flex-direction:column;min-width:0;}" +
            ".admin-invoice-f__meta-col--left{text-align:left;}" +
            ".admin-invoice-f__meta-col p{margin:0;white-space:normal;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__table{width:100%;margin:22px 0 0;border-collapse:collapse;table-layout:fixed;font-size:11px;}" +
            ".admin-invoice-f__table th{height:48px;padding:6px 3px;background:#A61579;color:#fff;border-left:1px solid #fff;font-size:11px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__table th:last-child{border-left:0;}" +
            ".admin-invoice-f__table th:nth-child(1){width:27%;}.admin-invoice-f__table th:nth-child(2){width:17%;}.admin-invoice-f__table th:nth-child(3){width:13%;}.admin-invoice-f__table th:nth-child(4){width:13%;}.admin-invoice-f__table th:nth-child(5){width:30%;}" +
            ".admin-invoice-f__table td{min-height:52px;height:52px;padding:7px 3px;border:0;text-align:center;vertical-align:middle;font-size:11px;overflow-wrap:anywhere;word-break:break-word;}" +
            ".admin-invoice-f__table td.invoice-item-name{text-align:right;}" +
            ".admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__summary-wrap{margin-top:28px;display:flex;flex-direction:column;align-items:stretch;}" +
            ".admin-invoice-f__summary{width:100%;max-width:360px;margin-right:auto;display:flex;flex-direction:column;gap:6px;}" +
            ".invoice-summary-row-f{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;line-height:1.65;direction:rtl;}" +
            ".invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;}" +
            ".invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:15px;font-weight:700;}" +
            ".invoice-profit-f{width:100%;max-width:360px;margin:18px auto 0 0;padding:10px 12px;border:1px dashed #A61579;background:#FBF2F8;}" +
            ".invoice-profit-title-f{margin-bottom:7px;color:#A61579;font-size:11px;font-weight:700;}" +
            ".admin-invoice-f__footer{width:90%;margin:0 auto;padding:22px 16px 24px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:#F3EFE8;color:#A61579;}" +
            ".admin-invoice-f__contact-f{font-family:Arial,Tahoma,sans-serif;font-size:11px;line-height:1.7;text-align:left;}" +
            ".admin-invoice-f__contact-f p{margin:0;}" +
            ".admin-invoice-f__thanks-f{margin:0;font-size:17px;font-weight:700;text-align:right;white-space:normal;}" +
            "@media(min-width:701px){.admin-invoice-f{width:640px;}.admin-invoice-f__band{height:200px;min-height:200px;padding:42px 24px 26px;}.admin-invoice-f__band-logo{font-size:64px;letter-spacing:.16em;}.admin-invoice-f__band-sub{font-size:22px;letter-spacing:.34em;}.admin-invoice-f__card{width:90%;padding:0 18px 36px;}.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;gap:30px;font-size:15px;line-height:1.8;}.admin-invoice-f__meta-col p{white-space:nowrap;}.admin-invoice-f__table{margin-top:30px;font-size:14px;}.admin-invoice-f__table th{height:64px;padding:8px 7px;font-size:15px;border-left:2px solid #fff;}.admin-invoice-f__table td{height:62px;padding:8px 7px;font-size:14px;}.admin-invoice-f__summary-wrap{margin-top:42px;align-items:flex-end;}.admin-invoice-f__summary,.invoice-profit-f{width:315px;max-width:none;}.admin-invoice-f__footer{min-height:120px;padding:28px 0 0;gap:30px;}.admin-invoice-f__contact-f{font-size:14px;}.admin-invoice-f__thanks-f{font-size:22px;}}" +
            "@media(max-width:360px){.admin-invoice-f__meta{grid-template-columns:1fr;gap:5px;}.admin-invoice-f__meta-col--left{text-align:right;}.admin-invoice-f__table,.admin-invoice-f__table td{font-size:10px;}.admin-invoice-f__table th{font-size:10px;padding-left:2px;padding-right:2px;}.invoice-summary-row-f{font-size:11px;}}" +
            "@page{size:A4 portrait;margin:0;}@media print{html,body{width:100%;background:#F3EFE8!important;}body{margin:0!important;padding:0!important;}.admin-invoice-f{width:640px!important;max-width:none!important;margin:0 auto!important;}.admin-invoice-f__band{height:200px!important;min-height:200px!important;padding:42px 24px 26px!important;}.admin-invoice-f__band-logo{font-size:64px!important;}.admin-invoice-f__band-sub{font-size:22px!important;}.admin-invoice-f__card{width:90%!important;padding:0 18px 36px!important;}.admin-invoice-f__meta{display:flex!important;min-height:92px!important;padding:17px 0 15px!important;gap:30px!important;font-size:15px!important;}.admin-invoice-f__meta-col p{white-space:nowrap!important;}.admin-invoice-f__table{margin-top:30px!important;font-size:14px!important;}.admin-invoice-f__table th{height:64px!important;padding:8px 7px!important;font-size:15px!important;}.admin-invoice-f__table td{height:62px!important;padding:8px 7px!important;font-size:14px!important;}.admin-invoice-f__summary-wrap{margin-top:42px!important;align-items:flex-end!important;}.admin-invoice-f__summary,.invoice-profit-f{width:315px!important;max-width:none!important;}.admin-invoice-f__footer{min-height:120px!important;padding:28px 0 0!important;gap:30px!important;}.admin-invoice-f__contact-f{font-size:14px!important;}.admin-invoice-f__thanks-f{font-size:22px!important;}}";

        var printWindow = window.open("", "_blank", "width=850,height=1050");
        if (!printWindow) {
            showToastF("مرورگر اجازه‌ی باز کردن پنجره‌ی چاپ را نداد — لطفاً پاپ‌آپ‌بلاکر را غیرفعال کنید.", "error");
            return;
        }

        printWindow.document.write(
            "<!DOCTYPE html><html lang=\"fa\" dir=\"rtl\"><head>" +
            "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
            "<base href=\"" + window.location.origin + "/\"><title>فاکتور — SANAA</title>" +
            "<style>" + printCss + "</style></head><body>" +
            printContent.outerHTML +
            "</body></html>"
        );
        printWindow.document.close();

        var printed = false;
        function doPrint() {
            if (printed) return;
            printed = true;
            printWindow.focus();
            printWindow.print();
            if (fromDownloadF) {
                showToastF("پنجره چاپ باز شد؛ برای PDF گزینه «Save as PDF» را انتخاب کنید.", null);
            }
        }

        function waitForAssets() {
            var doc = printWindow.document;
            var images = Array.prototype.slice.call(doc.images || []);
            var imagePromises = images.map(function (img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function (resolve) {
                    img.addEventListener("load", resolve, { once: true });
                    img.addEventListener("error", resolve, { once: true });
                });
            });
            var fontsPromise = doc.fonts && doc.fonts.ready
                ? doc.fonts.ready.catch(function () {})
                : Promise.resolve();
            Promise.all(imagePromises.concat([fontsPromise])).then(function () {
                window.setTimeout(doPrint, 180);
            });
        }

        if (printWindow.document.readyState === "complete") {
            waitForAssets();
        } else {
            printWindow.addEventListener("load", waitForAssets, { once: true });
            window.setTimeout(waitForAssets, 700);
        }
    }


    function initInvoiceModalsF() {

        document.querySelectorAll(
            "[data-invoice-close]"
        ).forEach(function (btn) {

            btn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                    closeInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                }
            );

        });


        document.querySelectorAll(
            "[data-invoice-print]"
        ).forEach(function (btn) {

            btn.addEventListener(
                "click",
                function () {

                    var containerId =
                        btn.dataset.invoicePrint;

                    printInvoiceF(containerId);

                }
            );

        });


        var goToAdminBtn =
            document.getElementById(
                "adminGoToAdminInvoiceF"
            );

        if (goToAdminBtn) {

            goToAdminBtn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                    openInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                }
            );

        }


        var backToCustomerBtn =
            document.getElementById(
                "adminBackToCustomerInvoiceF"
            );

        if (backToCustomerBtn) {

            backToCustomerBtn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                    openInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                }
            );

        }


        var finishBtn =
            document.getElementById(
                "adminFinishInvoiceF"
            );

        if (finishBtn) {

            finishBtn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                    closeInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                }
            );

        }

    }


    /* ----------------------------------------------------------
     * New order form — wiring
     * ---------------------------------------------------------- */

    /* ----------------------------------------------------------
     * Searchable customer select
     *
     * The real <select id="adminNewOrderCustomerF"> (server-
     * rendered from {% for customer in customers %}) stays the
     * form's source of truth and is kept in the DOM, just hidden.
     * This layer only adds a filterable text input + list on top
     * of it; selecting an item sets the real select's value.
     * ---------------------------------------------------------- */

    function syncCustomerComboDisplayF() {

        var select =
            document.getElementById(
                "adminNewOrderCustomerF"
            );

        var searchInput =
            document.getElementById(
                "adminNewOrderCustomerSearchF"
            );

        if (!select || !searchInput) {
            return;
        }

        var selectedOption =
            select.options[select.selectedIndex];

        searchInput.value =
            selectedOption && selectedOption.value
                ? selectedOption.textContent.trim()
                : "";

    }


    function initSearchableCustomerSelectF() {

        var wrapper =
            document.getElementById(
                "adminCustomerComboF"
            );

        var select =
            document.getElementById(
                "adminNewOrderCustomerF"
            );

        var searchInput =
            document.getElementById(
                "adminNewOrderCustomerSearchF"
            );

        var list =
            document.getElementById(
                "adminNewOrderCustomerListF"
            );

        if (!wrapper || !select || !searchInput || !list) {
            return;
        }


        // Build a plain lookup of the server-rendered options
        // once, up front.
        var options =
            Array.prototype.slice
                .call(select.options)
                .filter(function (option) {
                    return option.value;
                })
                .map(function (option) {
                    return {
                        value: option.value,
                        label: option.textContent.trim()
                    };
                });


        function renderListF(query) {

            var normalized =
                (query || "").trim().toLowerCase();

            var matches =
                normalized
                    ? options.filter(function (option) {
                        return option.label
                            .toLowerCase()
                            .indexOf(normalized) !== -1;
                    })
                    : options;

            list.innerHTML = "";

            if (!matches.length) {

                var empty =
                    document.createElement("li");

                empty.className =
                    "admin-searchable-select-f__empty";

                empty.textContent =
                    "مشتری‌ای پیدا نشد.";

                list.appendChild(empty);

                return;
            }

            matches.forEach(function (option) {

                var item =
                    document.createElement("li");

                item.className =
                    "admin-searchable-select-f__item";

                item.textContent = option.label;

                item.addEventListener(
                    "mousedown",
                    function (event) {

                        // mousedown (not click) so it fires before
                        // the search input's blur hides the list.
                        event.preventDefault();

                        select.value = option.value;
                        searchInput.value = option.label;

                        list.hidden = true;

                    }
                );

                list.appendChild(item);

            });

        }


        searchInput.addEventListener(
            "focus",
            function () {

                renderListF(searchInput.value);

                list.hidden = false;

            }
        );


        searchInput.addEventListener(
            "input",
            function () {

                // Typing invalidates whatever was picked before
                // until a new option is chosen from the list.
                select.value = "";

                renderListF(searchInput.value);

                list.hidden = false;

            }
        );


        searchInput.addEventListener(
            "blur",
            function () {

                list.hidden = true;

                // If nothing valid was picked, don't leave stray
                // typed text behind.
                if (!select.value) {
                    searchInput.value = "";
                }

            }
        );

    }


    function initNewOrderF() {

        var editingOrderId =
            null;


        var openBtn =
            document.getElementById(
                "adminNewOrderBtnF"
            );


        var modal =
            document.getElementById(
                "adminNewOrderModalF"
            );


        var closeBtn =
            document.getElementById(
                "adminNewOrderCloseF"
            );


        var cancelBtn =
            document.getElementById(
                "adminNewOrderCancelF"
            );


        var form =
            document.getElementById(
                "adminNewOrderFormF"
            );


        var submitBtn =
            document.getElementById(
                "adminSubmitInvoiceF"
            );


        var errorEl =
            document.getElementById(
                "adminNewOrderErrorF"
            );


        if (!openBtn || !modal || !form) {
            return;
        }


        initOrderItemsF();


        function showFormErrorF(message) {

            if (!errorEl) {
                return;
            }

            errorEl.textContent = message;
            errorEl.hidden = !message;

        }


        function closeNewOrderModal() {

            modal.hidden =
                true;

            editingOrderId =
                null;

        }


        function openNewOrderModal() {

            editingOrderId =
                null;


            form.reset();

            resetOrderItemsF();

            showFormErrorF("");


            var title =
                document.getElementById(
                    "adminNewOrderTitleF"
                );


            if (title) {

                title.textContent =
                    "ثبت سفارش جدید";
            }


            if (submitBtn) {

                submitBtn.textContent =
                    "ثبت فاکتور";
            }


            modal.hidden =
                false;
        }


        openEditOrderModalF =
            function (order) {

                if (!order) {
                    return;
                }


                editingOrderId =
                    order.id;


                form.reset();

                showFormErrorF("");


                var title =
                    document.getElementById(
                        "adminNewOrderTitleF"
                    );


                if (title) {

                    title.textContent =
                        "ویرایش سفارش " +
                        order.number;
                }


                if (submitBtn) {

                    submitBtn.textContent =
                        "ذخیره تغییرات";
                }


                var customerSelect =
                    document.getElementById(
                        "adminNewOrderCustomerF"
                    );


                if (customerSelect) {

                    customerSelect.value =
                        String(
                            order.customer.id
                        );

                    syncCustomerComboDisplayF();
                }


                var shippingInput =
                    document.getElementById(
                        "adminNewOrderShippingF"
                    );


                if (shippingInput) {

                    shippingInput.value =
                        Number(
                            order.shippingRial
                        ) || 0;
                }


                var serviceInput =
                    document.getElementById(
                        "adminNewOrderServiceF"
                    );


                if (serviceInput) {

                    serviceInput.value =
                        Number(
                            order.serviceRial
                        ) || 0;
                }


                var paymentInput =
                    document.getElementById(
                        "adminNewOrderPaymentF"
                    );


                if (paymentInput) {

                    paymentInput.value =
                        order.paymentStatus ||
                        "pending";
                }


                var container =
                    document.getElementById(
                        "adminOrderItemsF"
                    );


                if (container) {

                    container.innerHTML =
                        "";


                    var products =
                        Array.isArray(order.products)
                            ? order.products
                            : [];


                    products.forEach(
                        function (product) {

                            var row =
                                createOrderItemRowF(
                                    product
                                );


                            if (row) {

                                container.appendChild(
                                    row
                                );
                            }

                        }
                    );


                    if (!products.length) {

                        var emptyRow =
                            createOrderItemRowF();


                        if (emptyRow) {

                            container.appendChild(
                                emptyRow
                            );
                        }
                    }
                }


                modal.hidden =
                    false;
            };


        openBtn.addEventListener(
            "click",
            openNewOrderModal
        );


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeNewOrderModal
            );

        }


        if (cancelBtn) {

            cancelBtn.addEventListener(
                "click",
                closeNewOrderModal
            );

        }


        var backdrop =
            modal.querySelector(
                ".modal__backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeNewOrderModal
            );

        }






























  




    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            showFormErrorF("");

            var customerSelect =
                document.getElementById(
                    "adminNewOrderCustomerF"
                );

            var shippingInput =
                document.getElementById(
                    "adminNewOrderShippingF"
                );

            var serviceInput =
                document.getElementById(
                    "adminNewOrderServiceF"
                );

            var paymentInput =
                document.getElementById(
                    "adminNewOrderPaymentF"
                );

            var customer =
                customerSelect
                    ? customerSelect.value
                    : "";

            var shippingRial =
                shippingInput
                    ? Number(
                        shippingInput.value
                    ) || 0
                    : 0;

            var serviceRial =
                serviceInput
                    ? Number(
                        serviceInput.value
                    ) || 0
                    : 0;

            var paymentStatus =
                paymentInput
                    ? paymentInput.value
                    : "pending";

            // =========================
            // Customer validation
            // =========================

            if (!customer) {

                showFormErrorF(
                    "لطفاً مشتری سفارش را انتخاب کنید."
                );

                return;
            }

            // =========================
            // Items
            // =========================

            var itemsResult =
                readOrderItemsF();

            if (!itemsResult.items) {

                showFormErrorF(
                    itemsResult.error
                );

                return;
            }

            var items =
                itemsResult.items;

            // =========================
            // Loading
            // =========================
            var isEditing =
                Boolean(
                    editingOrderId
                );


            var originalLabel =
                submitBtn
                    ? submitBtn.textContent
                    : "";


            if (submitBtn) {

                submitBtn.disabled =
                    true;

                submitBtn.textContent =
                    isEditing
                        ? "در حال ذخیره تغییرات..."
                        : "در حال ثبت سفارش...";
            }
            // =========================
            // Exchange rates
            // =========================

            fetchExchangeRatesF()

                .then(function (rates) {

                    var calc =
                        buildInvoiceCalcF(
                            items,
                            rates,
                            shippingRial,
                            serviceRial
                        );

                    // =====================
                    // FormData
                    // =====================

                    var formData =
                        new FormData();

                    var csrfInput =
                        form.querySelector(
                            'input[name="csrfmiddlewaretoken"]'
                        );

                    if (csrfInput) {

                        formData.append(
                            "csrfmiddlewaretoken",
                            csrfInput.value
                        );
                    }

                    formData.append(
                        "customer_id",
                        customer
                    );

                    formData.append(
                        "shipping_cost",
                        String(shippingRial)
                    );

                    formData.append(
                        "service_cost",
                        String(serviceRial)
                    );

                    formData.append(
                        "payment_status",
                        paymentStatus
                    );

                    var usdRate =
                        rates &&
                        rates.USD
                            ? rates.USD.rate
                            : 0;

                    formData.append(
                        "usd_rate",
                        String(usdRate)
                    );

                    // =====================
                    // Products
                    // =====================

                    var backendItems =
                        items.map(
                            function (
                                item,
                                index
                            ) {

                                var rateData =
                                    rates[
                                        item.currency
                                    ];

                                var exchangeRate =
                                    rateData
                                        ? rateData.rate
                                        : 0;

                                if (item.file) {

                                    formData.append(
                                        "item_photo_" +
                                            index,
                                        item.file
                                    );
                                }

                                return {

                                    id:
                                        item.id || null,

                                    product_name:
                                        item.name,

                                    brand:
                                        item.brand,

                                    size:
                                        item.size,

                                    description:
                                        item.description,

                                    quantity:
                                        item.qty,

                                    currency:
                                        item.currency,

                                    product_price:
                                        item.price,

                                    exchange_rate:
                                        exchangeRate

                                };
                            }
                        );

                    formData.append(
                        "items",
                        JSON.stringify(
                            backendItems
                        )
                    );

                    var requestUrl =
                        isEditing
                            ?
                            buildOrderUrlF(
                                form.dataset
                                    .updateUrlTemplate,
                                editingOrderId
                            )
                            :
                            form.dataset
                                .createUrl;


                    console.log(
                        isEditing
                            ? "Update order URL:"
                            : "Create order URL:",
                        requestUrl
                    );


                    console.log(
                        "Customer ID:",
                        customer
                    );


                    console.log(
                        "Items:",
                        backendItems
                    );
                    // =====================
                    // Django request
                    // =====================

                    return fetch(
                        requestUrl,
                        {
                            method: "POST",
                            body: formData
                        }
                    )
                    .then(
                        function (response) {

                            return response
                                .text()
                                .then(
                                    function (text) {

                                        var data = {};

                                        try {

                                            data =
                                                JSON.parse(
                                                    text
                                                );

                                        } catch (error) {

                                            console.error(
                                                "Invalid backend response:",
                                                text
                                            );
                                        }

                                        return {
                                            ok:
                                                response.ok,

                                            status:
                                                response.status,

                                            data:
                                                data,

                                            raw:
                                                text,

                                            calc:
                                                calc
                                        };
                                    }
                                );
                        }
                    );

                })

                // =========================
                // Backend response
                // =========================

                .then(function (result) {

                    console.log(
                        isEditing
                            ? "Update order response:"
                            : "Create order response:",
                        result
                    );


                    if (!result.ok) {

                        var message =
                            result.data &&
                            result.data.message
                                ?
                                result.data.message
                                :
                                (
                                    "خطای سرور با کد " +
                                    result.status
                                );


                        throw new Error(
                            message
                        );
                    }


                    if (
                        !result.data ||
                        !result.data.order
                    ) {

                        throw new Error(
                            "اطلاعات سفارش از سرور دریافت نشد."
                        );
                    }


                    var savedOrder =
                        result.data.order;


                    var calc =
                        result.calc;


                    // اطلاعات واقعی برگشتی Django
                    // جای Order قبلی را می‌گیرد.
                    replaceOrderF(
                        savedOrder
                    );


                    // =====================
                    // Invoice
                    // =====================

                    var paymentLabels = {

                        pending:
                            "در انتظار پرداخت",

                        paid:
                            "پرداخت‌شده",

                        partial:
                            "پرداخت ناقص",

                        failed:
                            "پرداخت ناموفق",

                        cancelled:
                            "لغوشده"

                    };


                    var meta = {

                        orderNumber:
                            savedOrder.number,

                        date:
                            savedOrder.date,

                        customerName:
                            savedOrder.customer.name,

                        paymentLabel:
                            paymentLabels[
                                savedOrder.paymentStatus
                            ]
                            ||
                            savedOrder.paymentStatus

                    };


                    var customerInvoiceEl =
                        document.getElementById(
                            "adminCustomerInvoiceF"
                        );


                    var adminInvoiceEl =
                        document.getElementById(
                            "adminInternalInvoiceF"
                        );


                    if (customerInvoiceEl) {

                        customerInvoiceEl.innerHTML =
                            renderInvoiceHtmlF(
                                calc,
                                meta,
                                false
                            );
                    }


                    if (adminInvoiceEl) {

                        adminInvoiceEl.innerHTML =
                            renderInvoiceHtmlF(
                                calc,
                                meta,
                                true
                            );
                    }


                    // =====================
                    // Reset filters
                    // =====================

                    filtersF = {

                        search: "",
                        orderStatus: "all",
                        paymentStatus: "all",
                        invoiceStatus: "all",
                        sort: "newest"

                    };


                    var searchInput =
                        document.getElementById(
                            "adminOrderSearchF"
                        );


                    if (searchInput) {

                        searchInput.value =
                            "";
                    }


                    // لیست را دوباره از ordersF رندر کن
                    applyFiltersF();


                    closeNewOrderModal();


                    openInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );


                    showToastF(

                        isEditing
                            ?
                            (
                                "سفارش " +
                                savedOrder.number +
                                " با موفقیت ویرایش شد."
                            )
                            :
                            (
                                "سفارش " +
                                savedOrder.number +
                                " با موفقیت ثبت شد."
                            ),

                        "success"
                    );

                })

                .catch(function (error) {

                    console.error(
                        "Create / update order error:",
                        error
                    );

                    showFormErrorF(
                        error.message ||
                        "ذخیره سفارش انجام نشد."
                    );

                })

                // =========================
                // Finally
                // =========================

                .finally(function () {

                    if (submitBtn) {

                        submitBtn.disabled =
                            false;

                        submitBtn.textContent =
                            originalLabel;
                    }

                });

        }
    );

}
















    
    /* ============================================================
     * INIT
     * ============================================================ */

    function initAdminOrdersF() {

    initToolbarF();

    initDetailsSheetF();

    initGlobalActionsF();

    initNewOrderF();

    initSearchableCustomerSelectF();

    initInvoiceModalsF();

    applyFiltersF();

}


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initAdminOrdersF
        );

    } else {

        initAdminOrdersF();

    }

})();