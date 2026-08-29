/* ============================================================
 * Admin Panel — Order Management
 * Standalone Orders Page
 * Vanilla JS only
 * Mock data only
 * ============================================================ */

(function () {

    "use strict";


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
        }

    };


    /* ============================================================
     * MOCK ORDERS
     * ============================================================ */

    var mockOrdersF = [

        {
            number: "SN-10482",
            date: "۱۴۰۵/۰۵/۱۲",
            lastChangeDate: "۱۴۰۵/۰۵/۱۴",

            customer: {
                name: "سارا احمدی",
                phone: "۰۹۱۲۳۴۵۶۷۸۹",
                address: "تهران، خیابان ولیعصر، پلاک ۱۲",
                note: ""
            },

            products: [
                {
                    name: "کیف دستی چرم",
                    qty: 1,
                    unitPriceUsd: 75
                }
            ],

            currency: "USD",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "paid",
            orderStatus: "delivered",
            invoiceStatus: "issued",

            payment: {
                method: "درگاه بانکی",
                trackingCode: "TRX-88213",
                paidDate: "۱۴۰۵/۰۵/۱۲",
                paidRial: null,
                remainingRial: 0
            }
        },


        {
            number: "SN-10417",
            date: "۱۴۰۵/۰۴/۲۸",
            lastChangeDate: "۱۴۰۵/۰۵/۰۱",

            customer: {
                name: "سارا احمدی",
                phone: "۰۹۱۲۳۴۵۶۷۸۹",
                address: "تهران، خیابان ولیعصر، پلاک ۱۲",
                note: ""
            },

            products: [
                {
                    name: "کیف دستی چرم",
                    qty: 1,
                    unitPriceUsd: 68
                }
            ],

            currency: "USD",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "paid",
            orderStatus: "shipped",
            invoiceStatus: "sent",

            payment: {
                method: "درگاه بانکی",
                trackingCode: "TRX-88011",
                paidDate: "۱۴۰۵/۰۴/۲۸",
                paidRial: null,
                remainingRial: 0
            }
        },


        {
            number: "SN-10475",
            date: "۱۴۰۵/۰۵/۰۸",
            lastChangeDate: "۱۴۰۵/۰۵/۰۹",

            customer: {
                name: "نگار محمدی",
                phone: "۰۹۱۹۸۷۶۵۴۳۲",
                address: "اصفهان، خیابان چهارباغ، پلاک ۴۵",
                note: "مشتری ویژه"
            },

            products: [
                {
                    name: "روسری ابریشمی",
                    qty: 2,
                    unitPriceUsd: 22
                },

                {
                    name: "دستبند نقره",
                    qty: 1,
                    unitPriceUsd: 19
                }
            ],

            currency: "USD",

            discountRial: 500000,
            shippingRial: 0,

            paymentStatus: "pending",
            orderStatus: "registered",
            invoiceStatus: "waiting",

            payment: {
                method: "—",
                trackingCode: "—",
                paidDate: "—",
                paidRial: 0,
                remainingRial: null
            }
        },


        {
            number: "SN-10470",
            date: "۱۴۰۵/۰۵/۰۵",
            lastChangeDate: "۱۴۰۵/۰۵/۰۶",

            customer: {
                name: "کیانا ملکی",
                phone: "۰۹۱۷۷۶۵۴۳۲۱",
                address: "شیراز، بلوار زند، پلاک ۹",
                note: ""
            },

            products: [
                {
                    name: "کفش اسپرت زنانه",
                    qty: 1,
                    unitPriceUsd: 54
                }
            ],

            currency: "USD",

            discountRial: 0,
            shippingRial: 150000,

            paymentStatus: "partial",
            orderStatus: "preparing",
            invoiceStatus: "waiting",

            payment: {
                method: "درگاه بانکی",
                trackingCode: "TRX-88190",
                paidDate: "۱۴۰۵/۰۵/۰۵",
                paidRial: 15000000,
                remainingRial: null
            }
        },


        {
            number: "SN-10460",
            date: "۱۴۰۵/۰۵/۰۲",
            lastChangeDate: "۱۴۰۵/۰۵/۰۲",

            customer: {
                name: "مریم رضایی",
                phone: "۰۹۱۳۴۵۶۷۸۹۰",
                address: "تهران، سعادت‌آباد، پلاک ۲۲",
                note: ""
            },

            products: [
                {
                    name: "عطر جیبی",
                    qty: 3,
                    unitPriceEur: 12
                }
            ],

            currency: "EUR",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "failed",
            orderStatus: "registered",
            invoiceStatus: "error",

            payment: {
                method: "درگاه بانکی",
                trackingCode: "—",
                paidDate: "—",
                paidRial: 0,
                remainingRial: null
            }
        },


        {
            number: "SN-10412",
            date: "۱۴۰۵/۰۴/۲۵",
            lastChangeDate: "۱۴۰۵/۰۴/۲۷",

            customer: {
                name: "نگار محمدی",
                phone: "۰۹۱۹۸۷۶۵۴۳۲",
                address: "اصفهان، خیابان چهارباغ، پلاک ۴۵",
                note: "مشتری ویژه"
            },

            products: [
                {
                    name: "عینک آفتابی",
                    qty: 1,
                    unitPriceTry: 900
                }
            ],

            currency: "TRY",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "paid",
            orderStatus: "delivered",
            invoiceStatus: "issued",

            payment: {
                method: "کیف پول",
                trackingCode: "TRX-87765",
                paidDate: "۱۴۰۵/۰۴/۲۵",
                paidRial: null,
                remainingRial: 0
            }
        },


        {
            number: "SN-10390",
            date: "۱۴۰۵/۰۳/۱۴",
            lastChangeDate: "۱۴۰۵/۰۳/۱۸",

            customer: {
                name: "الهام کریمی",
                phone: "۰۹۱۵۲۲۳۳۴۴۵",
                address: "مشهد، بلوار وکیل‌آباد، پلاک ۶",
                note: ""
            },

            products: [
                {
                    name: "شال پشمی",
                    qty: 1,
                    unitPriceUsd: 9
                }
            ],

            currency: "USD",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "paid",
            orderStatus: "returned",
            invoiceStatus: "issued",

            payment: {
                method: "درگاه بانکی",
                trackingCode: "TRX-86210",
                paidDate: "۱۴۰۵/۰۳/۱۴",
                paidRial: null,
                remainingRial: 0
            }
        },


        {
            number: "SN-10355",
            date: "۱۴۰۵/۰۴/۰۳",
            lastChangeDate: "۱۴۰۵/۰۴/۰۵",

            customer: {
                name: "سارا احمدی",
                phone: "۰۹۱۲۳۴۵۶۷۸۹",
                address: "تهران، خیابان ولیعصر، پلاک ۱۲",
                note: ""
            },

            products: [
                {
                    name: "کفش اسپرت زنانه",
                    qty: 1,
                    unitPriceUsd: 65
                }
            ],

            currency: "USD",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "cancelled",
            orderStatus: "cancelled",
            invoiceStatus: "waiting",

            payment: {
                method: "—",
                trackingCode: "—",
                paidDate: "—",
                paidRial: 0,
                remainingRial: null
            }
        },


        {
            number: "SN-10521",
            date: "۱۴۰۵/۰۵/۲۰",
            lastChangeDate: "۱۴۰۵/۰۵/۲۰",

            customer: {
                name: "بهاره اسدی",
                phone: "۰۹۱۴۴۵۵۶۶۷۷",
                address: "تبریز، خیابان امام، پلاک ۳۰",
                note: ""
            },

            products: [
                {
                    name: "پیراهن نخی",
                    qty: 1,
                    unitPriceUsd: 31
                },

                {
                    name: "شلوار کتان",
                    qty: 1,
                    unitPriceUsd: 27
                },

                {
                    name: "کمربند چرم",
                    qty: 1,
                    unitPriceUsd: 14
                }
            ],

            currency: "USD",

            discountRial: 0,
            shippingRial: 0,

            paymentStatus: "paid",
            orderStatus: "confirmed",
            invoiceStatus: "issued",

            payment: {
                method: "درگاه بانکی",
                trackingCode: "TRX-88401",
                paidDate: "۱۴۰۵/۰۵/۲۰",
                paidRial: null,
                remainingRial: 0
            }
        }

    ];


    /* ============================================================
     * STATUS MAPS
     * ============================================================ */

    var ORDER_STATUS_F = {

        registered: {
            label: "ثبت‌شده",
            color: "neutral"
        },

        confirmed: {
            label: "تأییدشده",
            color: "info"
        },

        preparing: {
            label: "در حال آماده‌سازی",
            color: "warning"
        },

        shipped: {
            label: "ارسال‌شده",
            color: "primary"
        },

        delivered: {
            label: "تحویل داده‌شده",
            color: "success"
        },

        cancelled: {
            label: "لغوشده",
            color: "danger"
        },

        returned: {
            label: "مرجوع‌شده",
            color: "danger"
        }

    };


    var PAYMENT_STATUS_F = {

        paid: {
            label: "پرداخت‌شده",
            color: "success"
        },

        pending: {
            label: "در انتظار پرداخت",
            color: "warning"
        },

        failed: {
            label: "پرداخت ناموفق",
            color: "danger"
        },

        partial: {
            label: "پرداخت ناقص",
            color: "warning"
        },

        cancelled: {
            label: "لغوشده",
            color: "danger"
        }

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

        return 0;

    }


    function orderTotalsF(order) {

        var rate = EXCHANGE_RATES_F[order.currency].rate;

        var baseAmount = order.products.reduce(function (sum, product) {

            return sum + unitPriceF(product) * product.qty;

        }, 0);


        var productsRial = baseAmount * rate;

        var totalRial =
            productsRial -
            order.discountRial +
            order.shippingRial;


        return {

            baseAmount: baseAmount,
            productsRial: productsRial,
            totalRial: totalRial,
            rate: rate

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

        return (

            '<button type="button" class="admin-icon-btn-f" ' +
            'data-view-order-f="' +
            orderNumber +
            '" ' +
            'aria-label="مشاهده جزئیات سفارش ' +
            orderNumber +
            '" ' +
            'title="مشاهده جزئیات">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +

            '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke-linecap="round" stroke-linejoin="round"/>' +

            '<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>' +

            "</svg>" +

            "</button>" +


            '<button type="button" class="admin-icon-btn-f admin-icon-btn-f--download-f" ' +
            'data-download-order-f="' +
            orderNumber +
            '" ' +
            'aria-label="دانلود PDF سفارش ' +
            orderNumber +
            '" ' +
            'title="دانلود PDF">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +

            '<path d="M12 3v12m0 0-4-4m4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>' +

            '<path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" stroke-linecap="round" stroke-linejoin="round"/>' +

            "</svg>" +

            "</button>" +


            '<div class="admin-menu-f">' +

            '<button type="button" class="admin-icon-btn-f" ' +
            'data-more-menu-btn-f="' +
            orderNumber +
            '" ' +
            'aria-haspopup="true" ' +
            'aria-expanded="false" ' +
            'title="بیشتر">' +

            '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
            '<circle cx="5" cy="12" r="1.6"/>' +
            '<circle cx="12" cy="12" r="1.6"/>' +
            '<circle cx="19" cy="12" r="1.6"/>' +
            "</svg>" +

            "</button>" +


            '<div class="admin-menu-f__panel" ' +
            'data-more-menu-panel-f="' +
            orderNumber +
            '" hidden>' +


            '<button type="button" class="admin-menu-f__item" ' +
            'data-edit-order-f="' +
            orderNumber +
            '">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M4 20h4l11-11-4-4L4 16v4Z" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +

            "ویرایش سفارش" +

            "</button>" +


            '<button type="button" class="admin-menu-f__item" ' +
            'data-resend-invoice-f="' +
            orderNumber +
            '">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M4 4v6h6M20 20v-6h-6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M5 15a7 7 0 0 0 12 3l3-3M19 9A7 7 0 0 0 7 6L4 9" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +

            "ارسال مجدد فاکتور" +

            "</button>" +


            '<button type="button" class="admin-menu-f__item admin-menu-f__item--danger-f" ' +
            'data-cancel-order-f="' +
            orderNumber +
            '">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="9" stroke-linecap="round"/>' +
            '<path d="m9 9 6 6m0-6-6 6" stroke-linecap="round"/>' +
            "</svg>" +

            "لغو سفارش" +

            "</button>" +


            "</div>" +

            "</div>"

        );

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


            '<td class="admin-orders-f__table-product">' +
            productSummaryF(order) +
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

            '<span class="admin-orders-f__card-customer">' +
            order.customer.name +
            "</span>" +


            '<span class="admin-orders-f__card-product">' +
            order.products[0].name +
            (
                order.products.length > 1
                    ? " (+ " +
                    formatNumberF(
                        order.products.length - 1
                    ) +
                    " محصول دیگر)"
                    : ""
            ) +
            "</span>" +


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

        var filtered =
            mockOrdersF.filter(
                function (order) {


                    if (
                        filtersF.orderStatus !== "all" &&
                        order.orderStatus !==
                        filtersF.orderStatus
                    ) {

                        return false;

                    }


                    if (
                        filtersF.paymentStatus !== "all" &&
                        order.paymentStatus !==
                        filtersF.paymentStatus
                    ) {

                        return false;

                    }


                    if (
                        filtersF.invoiceStatus !== "all" &&
                        order.invoiceStatus !==
                        filtersF.invoiceStatus
                    ) {

                        return false;

                    }


                    if (filtersF.search) {

                        var q =
                            filtersF.search
                                .toLowerCase();


                        var matches =

                            order.number
                                .toLowerCase()
                                .indexOf(q) !== -1

                            ||

                            order.customer.name
                                .indexOf(q) !== -1

                            ||

                            order.products.some(
                                function (product) {

                                    return product.name
                                        .indexOf(q) !== -1;

                                }
                            );


                        if (!matches) {
                            return false;
                        }

                    }


                    return true;

                }
            );


        var sorted =
            filtered.slice();


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

                        return (
                            a.lastChangeDate <
                            b.lastChangeDate
                        )
                            ? 1
                            : -1;

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


        mockOrdersF.forEach(
            function (order) {

                var totals =
                    orderTotalsF(order);


                rows.push([

                    order.number,

                    order.customer.name,

                    order.date,

                    Math.round(
                        totals.totalRial
                    ),

                    PAYMENT_STATUS_F[
                        order.paymentStatus
                    ].label,

                    ORDER_STATUS_F[
                        order.orderStatus
                    ].label

                ]);

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

                            '<span class="admin-orders-f__sheet-product-qty">' +

                            "تعداد: " +
                            formatNumberF(
                                product.qty
                            ) +

                            " · قیمت واحد: " +

                            formatNumberF(
                                price
                            ) +

                            " " +

                            currencyLabel +

                            "</span>" +

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

            "<span>تخفیف</span>" +

            "<span>" +

            (
                order.discountRial
                    ?
                    "-" +
                    formatNumberF(
                        order.discountRial
                    ) +
                    " ریال"
                    :
                    "ندارد"
            ) +

            "</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>هزینه ارسال</span>" +

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
     * PDF PLACEHOLDER
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

        return new Promise(
            function (resolve, reject) {

                window.setTimeout(
                    function () {

                        reject(
                            new Error(
                                "backend_not_connected"
                            )
                        );

                    },
                    700
                );

            }
        );

    }


    function downloadOrderF(
        orderNumber
    ) {

        var order =
            mockOrdersF.filter(
                function (item) {

                    return (
                        item.number ===
                        orderNumber
                    );

                }
            )[0];


        if (!order) {

            showToastF(
                "سفارش پیدا نشد.",
                "error"
            );

            return;

        }


        var triggers =
            document.querySelectorAll(
                '[data-download-order-f="' +
                orderNumber +
                '"]'
            );


        triggers.forEach(
            function (button) {

                button.setAttribute(
                    "aria-busy",
                    "true"
                );

                button.disabled = true;

            }
        );


        showToastF(
            "در حال آماده‌سازی فایل PDF سفارش " +
            orderNumber +
            "…",
            null
        );


        fetchInvoicePdfBlobF(
            orderNumber
        )

            .then(
                function (blob) {

                    var url =
                        URL.createObjectURL(
                            blob
                        );


                    var link =
                        document.createElement(
                            "a"
                        );


                    link.href = url;

                    link.download =
                        "invoice-" +
                        orderNumber +
                        ".pdf";


                    document.body.appendChild(
                        link
                    );

                    link.click();

                    document.body.removeChild(
                        link
                    );


                    URL.revokeObjectURL(
                        url
                    );


                    showToastF(
                        "فایل سفارش " +
                        orderNumber +
                        " با موفقیت دانلود شد.",
                        "success"
                    );

                }
            )

            .catch(
                function () {

                    showToastF(
                        "سرویس تولید فاکتور هنوز به بک‌اند متصل نشده. لطفاً بعداً دوباره تلاش کنید.",
                        "error"
                    );

                }
            )

            .then(
                function () {

                    triggers.forEach(
                        function (button) {

                            button.removeAttribute(
                                "aria-busy"
                            );

                            button.disabled =
                                false;

                        }
                    );

                }
            );

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
                    mockOrdersF.filter(
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

                    if (!activeOrderNumber) {
                        return;
                    }


                    showToastF(
                        "ویرایش سفارش هنوز در این نسخه پیاده‌سازی نشده است.",
                        "error"
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


                    var order =
                        mockOrdersF.filter(
                            function (item) {

                                return (
                                    item.number ===
                                    activeOrderNumber
                                );

                            }
                        )[0];


                    if (!order) {
                        return;
                    }


                    order.orderStatus =
                        statusSelect.value;


                    order.lastChangeDate =
                        "۱۴۰۵/۰۵/۲۱";


                    showToastF(
                        "وضعیت سفارش به «" +
                        ORDER_STATUS_F[
                            order.orderStatus
                        ].label +
                        "» تغییر کرد.",
                        "success"
                    );


                    renderDetailsSheetF(
                        order
                    );


                    applyFiltersF();

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

                    showToastF(
                        "ویرایش سفارش هنوز در این نسخه پیاده‌سازی نشده است.",
                        "error"
                    );


                    closeAllMenusF();

                    return;

                }


                var resendTrigger =
                    event.target.closest(
                        "[data-resend-invoice-f]"
                    );


                if (resendTrigger) {

                    showToastF(
                        "فاکتور دوباره برای مشتری ارسال شد.",
                        "success"
                    );


                    closeAllMenusF();

                    return;

                }


                var cancelTrigger =
                    event.target.closest(
                        "[data-cancel-order-f]"
                    );


                if (cancelTrigger) {

                    var number =
                        cancelTrigger.getAttribute(
                            "data-cancel-order-f"
                        );


                    closeAllMenusF();


                    if (
                        window.confirm(
                            "آیا از لغو سفارش " +
                            number +
                            " مطمئن هستید؟"
                        )
                    ) {

                        var order =
                            mockOrdersF.filter(
                                function (item) {

                                    return (
                                        item.number ===
                                        number
                                    );

                                }
                            )[0];


                        if (order) {

                            order.orderStatus =
                                "cancelled";


                            if (
                                order.paymentStatus !==
                                "paid"
                            ) {

                                order.paymentStatus =
                                    "cancelled";

                            }


                            applyFiltersF();


                            showToastF(
                                "سفارش " +
                                number +
                                " لغو شد.",
                                "success"
                            );

                        }

                    }


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

    function initNewOrderF() {

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


        if (!openBtn || !modal || !form) {
            return;
        }


        function closeNewOrderModal() {

            modal.hidden =
                true;

        }


        function openNewOrderModal() {

            modal.hidden =
                false;

        }



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


                var customer =
                    document.getElementById(
                        "adminNewOrderCustomerF"
                    ).value;


                var product =
                    document.getElementById(
                        "adminNewOrderProductF"
                    ).value.trim();


                var quantity =
                    Number(
                        document.getElementById(
                            "adminNewOrderQuantityF"
                        ).value
                    );


                var price =
                    Number(
                        document.getElementById(
                            "adminNewOrderPriceF"
                        ).value
                    );


                var currency =
                    document.getElementById(
                        "adminNewOrderCurrencyF"
                    ).value;


                var paymentStatus =
                    document.getElementById(
                        "adminNewOrderPaymentF"
                    ).value;


                if (
                    !customer ||
                    !product ||
                    !quantity ||
                    price < 0
                ) {

                    showToastF(
                        "لطفاً اطلاعات سفارش را کامل وارد کنید.",
                        "error"
                    );

                    return;

                }


                var nextNumber =
                    10522 +
                    mockOrdersF.length;


                var orderNumber =
                    "SN-" +
                    nextNumber;


                var newOrder = {

                    number:
                        orderNumber,

                    date:
                        "۱۴۰۵/۰۵/۲۱",

                    lastChangeDate:
                        "۱۴۰۵/۰۵/۲۱",


                    customer: {

                        name:
                            customer,

                        phone:
                            "—",

                        address:
                            "—",

                        note:
                            "ثبت سفارش توسط ادمین"

                    },


                    products: [

                        {

                            name:
                                product,

                            qty:
                                quantity,

                            ...(currency === "USD"
                                ? {
                                    unitPriceUsd:
                                        price
                                }
                                : {}),

                            ...(currency === "EUR"
                                ? {
                                    unitPriceEur:
                                        price
                                }
                                : {}),

                            ...(currency === "TRY"
                                ? {
                                    unitPriceTry:
                                        price
                                }
                                : {})

                        }

                    ],


                    currency:
                        currency,


                    discountRial:
                        0,

                    shippingRial:
                        0,


                    paymentStatus:
                        paymentStatus,

                    orderStatus:
                        "registered",

                    invoiceStatus:
                        "waiting",


                    payment: {

                        method:
                            "ثبت دستی توسط ادمین",

                        trackingCode:
                            "—",

                        paidDate:
                            paymentStatus === "paid"
                                ? "۱۴۰۵/۰۵/۲۱"
                                : "—",

                        paidRial:
                            0,

                        remainingRial:
                            null

                    }

                };


                mockOrdersF.unshift(
                    newOrder
                );


                form.reset();


                document.getElementById(
                    "adminNewOrderQuantityF"
                ).value = "1";


                closeNewOrderModal();


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
                    searchInput.value = "";
                }


                applyFiltersF();


                showToastF(
                    "سفارش " +
                    orderNumber +
                    " با موفقیت ثبت شد.",
                    "success"
                );

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