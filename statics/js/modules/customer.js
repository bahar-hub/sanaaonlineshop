// ========================================
// Sanaa Customer Panel
// ========================================

const USD_TO_RIAL = 605000;


function getMockOrders() {

    return [
        {
            id: "SN-10482",
            date: "1404/05/12",
            status: "delivered",
            items: [
                {
                    name: "پیراهن کتان سنا",
                    image: "https://picsum.photos/seed/sanaa-dress/120/120",
                    qty: 1,
                    priceUSD: 42
                },
                {
                    name: "شال ابریشم گلدار",
                    image: "https://picsum.photos/seed/sanaa-scarf/120/120",
                    qty: 2,
                    priceUSD: 16
                }
            ],
            shipping: 450000,
            services: 120000
        },
        {
            id: "SN-10417",
            date: "1404/04/28",
            status: "shipped",
            items: [
                {
                    name: "کیف دستی چرم",
                    image: "https://picsum.photos/seed/sanaa-bag/120/120",
                    qty: 1,
                    priceUSD: 68
                }
            ],
            shipping: 0,
            services: 90000
        },
        {
            id: "SN-10355",
            date: "1404/04/03",
            status: "registered",
            items: [
                {
                    name: "بلوز آستین‌بلند",
                    image: "https://picsum.photos/seed/sanaa-blouse/120/120",
                    qty: 1,
                    priceUSD: 24
                },
                {
                    name: "شلوار پارچه‌ای",
                    image: "https://picsum.photos/seed/sanaa-pants/120/120",
                    qty: 1,
                    priceUSD: 29
                },
                {
                    name: "روسری ابریشمی",
                    image: "https://picsum.photos/seed/sanaa-hijab/120/120",
                    qty: 1,
                    priceUSD: 11
                }
            ],
            shipping: 450000,
            services: 120000
        }
    ];
}

const ORDER_STATUS_LABELS = {
    registered: "ثبت شده",
    confirmed: "تأیید شده",
    preparing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل داده شده",
    cancelled: "لغو شده",
    returned: "مرجوع شده"
};


// ========================================
// Formatting Helpers
// ========================================

function formatUSD(value) {

    return "$" + value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatRial(value) {

    return Math.round(value).toLocaleString("fa-IR") + " ریال";
}

function toPersianDigits(value) {

    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

    return String(value).replace(/[0-9]/g, (digit) => persianDigits[digit]);
}

function escapeHtml(text) {

    if (text === null || text === undefined) {
        return "";
    }

    const div = document.createElement("div");
    div.textContent = text;

    return div.innerHTML;
}

function calcItemsSubtotalUSD(items) {

    return items.reduce((sum, item) => {
        return sum + (item.priceUSD * item.qty);
    }, 0);
}

function calcOrderTotalRial(order) {

    const itemsSubtotalRial =
        calcItemsSubtotalUSD(order.items) * USD_TO_RIAL;

    return itemsSubtotalRial + order.shipping + order.services;
}


// ========================================
// Customer Tabs
// ========================================

function initCustomerTabs() {

    const tabs =
        document.querySelectorAll("[data-customer-tab]");

    const panels =
        document.querySelectorAll("[data-customer-panel]");

    if (!tabs.length || !panels.length) {
        return;
    }

    tabs.forEach((tab) => {

        tab.addEventListener("click", () => {

            const target = tab.dataset.customerTab;

            tabs.forEach((item) => {

                const isActive = item === tab;

                item.classList.toggle("is-active", isActive);
                item.setAttribute("aria-selected", isActive);
            });

            panels.forEach((panel) => {

                panel.classList.toggle(
                    "is-active",
                    panel.dataset.customerPanel === target
                );
            });
        });
    });
}


// ========================================
// Profile Form
// ========================================

function populateProfileForm(user) {

    const form = document.getElementById("profileForm");

    if (!form || !user) {
        return;
    }

    form.elements.phone.value = user.phone || "";
    form.elements.address.value = user.address || "";
}


function clearFieldError(fieldName, prefix = "profile") {

    const input = document.getElementById(`${prefix}${capitalize(fieldName)}`);
    const error = document.getElementById(`${prefix}${capitalize(fieldName)}Error`);

    if (input) {
        input.classList.remove("is-invalid");
    }

    if (error) {
        error.textContent = "";
    }
}


function setFieldError(fieldName, message, prefix = "profile") {

    const input = document.getElementById(`${prefix}${capitalize(fieldName)}`);
    const error = document.getElementById(`${prefix}${capitalize(fieldName)}Error`);

    if (input) {
        input.classList.add("is-invalid");
    }

    if (error) {
        error.textContent = message;
    }
}


function capitalize(text) {

    return text.charAt(0).toUpperCase() + text.slice(1);
}


function validateProfileForm(data) {

    let isValid = true;

    clearFieldError("phone");
    clearFieldError("address");

    const phonePattern = /^09\d{9}$/;

    if (!phonePattern.test(data.phone.trim())) {

        setFieldError(
            "phone",
            "شماره تلفن باید به‌صورت ۰۹xxxxxxxxx باشد."
        );

        isValid = false;
    }

    if (data.address.trim().length < 10) {

        setFieldError(
            "address",
            "آدرس باید حداقل ۱۰ کاراکتر باشد."
        );

        isValid = false;
    }

    return isValid;
}


function handleProfileSubmit(event) {

    const form = event.currentTarget;

    clearAuthError("profileForm");

    const formData = new FormData(form);

    const data = {
        phone: formData.get("phone") || "",
        address: formData.get("address") || ""
    };

    if (!validateProfileForm(data)) {
        event.preventDefault();
        return;
    }

    // اگر معتبر بود، اجازه بده فرم به Django ارسال شود.
}


function initProfileForm() {

    const form = document.getElementById("profileForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleProfileSubmit);

    populateProfileForm(getCurrentUser());
}


// ========================================
// Change Password
// ========================================


function validateChangePasswordForm(data) {

    let isValid = true;

    clearFieldError("password", "old");
    clearFieldError("password", "new");

    if (!data.oldPassword) {

        setFieldError(
            "password",
            "رمز عبور فعلی را وارد کنید.",
            "old"
        );

        isValid = false;
    }

    if (!data.newPassword || data.newPassword.trim().length < 6) {

        setFieldError(
            "password",
            "رمز عبور جدید باید حداقل ۶ کاراکتر باشد.",
            "new"
        );

        isValid = false;

    } else if (data.newPassword === data.oldPassword) {

        setFieldError(
            "password",
            "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
            "new"
        );

        isValid = false;
    }

    return isValid;
}


function handleChangePasswordSubmit(event) {

    const form = event.currentTarget;

    clearAuthError("changePasswordForm");

    const formData = new FormData(form);

    const data = {
        oldPassword: formData.get("oldPassword") || "",
        newPassword: formData.get("newPassword") || ""
    };

    if (!validateChangePasswordForm(data)) {

        event.preventDefault();

        return;
    }

    // اطلاعات معتبر است.
    // اجازه بده فرم به صورت معمول به Django ارسال شود.
}



function initChangePasswordForm() {

    const form = document.getElementById("changePasswordForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleChangePasswordSubmit);
}


// ========================================
// Order List
// ========================================
async function getCustomerOrders() {

    try {
        const response = await fetch("/profile/orders/");

        if (!response.ok) {
            throw new Error("خطا در دریافت سفارش‌ها");
        }

        return await response.json();

    } catch (error) {

        console.error("Customer orders error:", error);

        return [];
    }
}


async function renderOrderList() {

    const list = document.getElementById("orderList");
    const emptyState = document.getElementById("orderEmpty");

    if (!list) {
        return;
    }

    const orders = await getCustomerOrders();

    if (!orders.length) {

        list.innerHTML = "";
        list.hidden = true;

        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    list.hidden = false;

    if (emptyState) {
        emptyState.hidden = true;
    }

    list.innerHTML = "";

    orders.forEach((order) => {

        const li = document.createElement("li");

        li.innerHTML = `
            <button
                type="button"
                class="order-card"
                data-order-id="${order.id}"
            >
                <div class="order-card__top">
                    <span class="order-card__number">
                        سفارش ${toPersianDigits(order.id)}
                    </span>

                    <span class="order-status order-status--${order.status}">
                        ${ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                </div>

                <div class="order-card__bottom">
                    <span class="order-card__date">
                        ${toPersianDigits(order.date)}
                    </span>

                    <span class="order-card__total">
                        ${formatRial(order.totalIRR)}
                    </span>
                </div>
            </button>
        `;

        list.appendChild(li);
    });
}


function initOrderList() {

    const list = document.getElementById("orderList");

    if (!list) {
        return;
    }

    renderOrderList();

    list.addEventListener("click", (event) => {

        const card = event.target.closest("[data-order-id]");

        if (!card) {
            return;
        }

        openOrderModal(card.dataset.orderId);
    });
}


// ========================================
// Order Modal
// ========================================

function fitInvoiceToWrapF(wrapId) {

    const wrap = document.getElementById(wrapId);

    if (!wrap) {
        return;
    }

    const invoice = wrap.querySelector(".admin-invoice-f");

    if (!invoice) {
        return;
    }

    invoice.style.transform = "none";

    const naturalWidth = invoice.offsetWidth;
    const naturalHeight = invoice.offsetHeight;
    const availableWidth = wrap.clientWidth;

    const scale =
        availableWidth > 0 && naturalWidth > 0
            ? Math.min(1, availableWidth / naturalWidth)
            : 1;

    invoice.style.transform = `scale(${scale})`;
    wrap.style.height = `${naturalHeight * scale}px`;

}

window.addEventListener("resize", () => {

    const wrap = document.getElementById("orderInvoiceScaleWrapF");

    if (wrap && !wrap.closest("[hidden]")) {
        fitInvoiceToWrapF("orderInvoiceScaleWrapF");
    }

});


async function openOrderModal(orderId) {

    try {

        const response = await fetch(
            `/profile/orders/${orderId}/`
        );

        if (!response.ok) {
            throw new Error("خطا در دریافت جزئیات سفارش");
        }

        const order = await response.json();

        const modal = document.getElementById("orderModal");
        const title = document.getElementById("orderModalTitle");
        const body = document.getElementById("orderModalBody");

        if (!modal || !body) {
            return;
        }

        if (title) {
            title.textContent = "";
        }

        // ساختار، متن‌ها و منطق محاسبه اینجا دقیقاً همان چیزی‌ست
        // که سمت ادمین در renderInvoiceHtmlF (حالت غیرادمین) صادر
        // می‌شود — تا فاکتور مشتری با فاکتوری که ادمین صادر کرده
        // یکی باشد.

        const itemsSubtotalUSD = order.items.reduce(
            (sum, item) => sum + (item.priceUSD * item.qty),
            0
        );

        const itemsSubtotalRial =
            itemsSubtotalUSD * USD_TO_RIAL;

        const grandTotal = order.totalIRR;

        // این دو فیلد فعلاً از API مشتری برنمی‌گردن — تا وقتی
        // بک‌اند اضافه‌شون نکنه به‌صورت امن fallback نشون داده می‌شن.
        const customerName =
            order.customerName
            || document.getElementById("profilePhone")?.value
            || "—";

        const paymentStatusLabel =
            order.paymentStatusLabel || "—";

        const itemRowsHtml = order.items.map((item) => {

            const lineRial =
                item.priceUSD * item.qty * USD_TO_RIAL;

            return `
                <tr>
                    <td class="invoice-item-name">${item.name ? escapeHtml(item.name) : "—"}</td>
                    <td>${item.brand ? escapeHtml(item.brand) : "—"}</td>
                    <td>${item.size ? escapeHtml(item.size) : "—"}</td>
                    <td>${toPersianDigits(item.qty || 0)}</td>
                    <td class="invoice-price">${formatRial(lineRial)}</td>
                </tr>
            `;

        }).join("");

        body.innerHTML = `

            <style id="customer-invoice-reference-style-f">
.invoice-scale-wrap-f{width:100%;overflow:hidden;display:flex;justify-content:center;align-items:flex-start;}
.admin-invoice-f{flex:0 0 auto;transform-origin:top center;width:640px;min-height:980px;margin:0 auto;background:#F3EFE8;color:#201B1D;direction:rtl;overflow:hidden;font-family:'Sanaa Persian',Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;font-variant-numeric:tabular-nums;}
.admin-invoice-f__band{height:150px;min-height:150px;padding:26px 24px 16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:#B8C2B8;text-align:center;}
.admin-invoice-f__band-logo{font-family:'Belleza',Georgia,serif;font-size:56px;line-height:1;color:#AE0F7C;letter-spacing:.16em;font-weight:400;}
.admin-invoice-f__band-sub{margin-top:8px;font-family:'Belleza',Georgia,serif;font-size:19px;line-height:1;color:#AE0F7C;letter-spacing:.34em;font-weight:400;}
.admin-invoice-f__band-type-f{margin-top:10px;font-size:12px;color:#5C5356;font-weight:700;}
.admin-invoice-f__card{width:630px;min-height:720px;margin:-1px auto 0;background:#fff;padding:0 18px 36px;box-shadow:0 0 0 1px rgba(0,0,0,.02);page-break-inside:avoid;}
.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;align-items:start;gap:30px;border-bottom:1px solid #4B4748;font-size:15px;line-height:1.8;}
.admin-invoice-f__meta-col{display:flex;flex-direction:column;gap:0;min-width:0;}
.admin-invoice-f__meta-col--left{text-align:left;}
.admin-invoice-f__meta-col p{margin:0;white-space:nowrap;overflow-wrap:anywhere;}
.admin-invoice-f__table{width:100%;margin:30px 0 0;border-collapse:collapse;table-layout:fixed;font-size:14px;}
.admin-invoice-f__table th{height:44px;padding:6px 7px;background:#AE0F7C;color:#fff;border-left:2px solid #fff;font-size:13px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;line-height:1.2;}
.admin-invoice-f__table th:nth-child(1){width:27%;}.admin-invoice-f__table th:nth-child(2){width:17%;}.admin-invoice-f__table th:nth-child(3){width:13%;}.admin-invoice-f__table th:nth-child(4){width:13%;}.admin-invoice-f__table th:nth-child(5){width:30%;}
.admin-invoice-f__table th:last-child{border-left:0;}
.admin-invoice-f__table td{min-height:62px;height:62px;padding:8px 7px;border:0;text-align:center;vertical-align:middle;font-size:14px;overflow-wrap:anywhere;word-break:break-word;}
.admin-invoice-f__table td.invoice-item-name{text-align:right;}
.admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}
.admin-invoice-f__summary-wrap{margin-top:42px;display:flex;flex-direction:column;align-items:flex-start;}
.admin-invoice-f__summary{width:315px;max-width:none;margin-right:0;display:flex;flex-direction:column;gap:6px;}
.invoice-summary-row-f{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:15px;line-height:1.65;direction:rtl;}
.invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;text-align:left;}
.invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:18px;font-weight:700;}
.invoice-summary-total-f strong:first-child{font-weight:800;}
.invoice-profit-f{width:315px;max-width:none;margin:22px 0 0 auto;padding:10px 12px;border:1px dashed #AE0F7C;background:#FBF2F8;}
.invoice-profit-title-f{margin-bottom:7px;color:#AE0F7C;font-size:11px;font-weight:700;}
.admin-invoice-f__footer{width:90%;margin:0 auto;min-height:120px;padding:28px 0 0;display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-wrap:nowrap;gap:30px;background:#F3EFE8;color:#AE0F7C;}
.admin-invoice-f__contact-f{flex:0 1 auto;min-width:0;font-family:Arial,Tahoma,sans-serif;font-size:14px;line-height:1.7;text-align:left;}
.admin-invoice-f__contact-f p{margin:0;overflow-wrap:anywhere;}
.admin-invoice-f__thanks-f{flex:0 1 auto;min-width:0;margin:0;font-size:22px;font-weight:700;text-align:right;white-space:normal;overflow-wrap:anywhere;}
.admin-invoice-f__footer-note{display:none;}
            </style>

            <div class="invoice-scale-wrap-f" id="orderInvoiceScaleWrapF">
            <div class="admin-invoice-f" dir="rtl">

                <div class="admin-invoice-f__band">
                    <span class="admin-invoice-f__band-logo" dir="ltr">SANAA</span>
                    <span class="admin-invoice-f__band-sub" dir="ltr">ONLINE SHOP</span>
                </div>

                <div class="admin-invoice-f__card">

                    <div class="admin-invoice-f__meta">
                        <div class="admin-invoice-f__meta-col">
                            <p><span>مشتری :</span> ${toPersianDigits(customerName)}</p>
                            <p><span>وضعیت پرداخت :</span> ${escapeHtml(paymentStatusLabel)}</p>
                        </div>
                        <div class="admin-invoice-f__meta-col admin-invoice-f__meta-col--left">
                            <p><span>شماره سفارش :</span> ${toPersianDigits(order.id)}</p>
                            <p><span>تاریخ صدور :</span> ${toPersianDigits(order.date)}</p>
                        </div>
                    </div>

                    <table class="admin-invoice-f__table">

                        <thead>
                            <tr>
                                <th>کالا</th>
                                <th>برند</th>
                                <th>سایز</th>
                                <th>تعداد</th>
                                <th>قیمت واحد</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${itemRowsHtml}
                        </tbody>

                    </table>

                    <div class="admin-invoice-f__summary-wrap">
                        <div class="admin-invoice-f__summary">

                            <div class="invoice-summary-row-f">
                                <span>جمع کل :</span>
                                <span>${formatRial(itemsSubtotalRial)}</span>
                            </div>

                            <div class="invoice-summary-row-f">
                                <span>هزینه خدمات :</span>
                                <span>${formatRial(order.services)}</span>
                            </div>

                            <div class="invoice-summary-row-f">
                                <span>هزینه باربری :</span>
                                <span>${formatRial(order.shipping)}</span>
                            </div>

                            <div class="invoice-summary-row-f invoice-summary-total-f">
                                <strong>مجموع کل</strong>
                                <strong>${formatRial(grandTotal)}</strong>
                            </div>

                        </div>
                    </div>

                </div>

                <div class="admin-invoice-f__footer">
                <p class="admin-invoice-f__thanks-f">با تشکر از خرید شما</p>
                    <div class="admin-invoice-f__contact-f" dir="ltr">
                        <p>instagram : sanaa.onlineshop</p>
                        <p>phone: +98 915 579 3189</p>
                        <p>website : sanaaonlineshop.com</p>
                    </div>
                </div>

            </div>
            </div>
        `;

        modal.hidden = false;

        requestAnimationFrame(() => {
            fitInvoiceToWrapF("orderInvoiceScaleWrapF");
        });

    } catch (error) {

        console.error(
            "Order detail error:",
            error
        );

    }
}


function closeOrderModal() {

    const modal = document.getElementById("orderModal");

    if (modal) {
        modal.hidden = true;
    }
}


function initOrderModal() {

    const modal = document.getElementById("orderModal");

    if (!modal) {
        return;
    }

    modal.querySelectorAll("[data-modal-close]").forEach((el) => {

        el.addEventListener("click", closeOrderModal);
    });

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape" && !modal.hidden) {
            closeOrderModal();
        }
    });
}


function printOrderInvoice() {

    const content = document.querySelector("#orderModalBody .admin-invoice-f");

    if (!content) {
        return;
    }

    const printContent = content.cloneNode(true);
    printContent.style.transform = "none";

    const fonts = window.SANAA_FONTS_F || {};

    const absoluteUrl = (path) =>
        path ? window.location.origin + path : "";

    const fontFaces =
        `@font-face{font-family:'Belleza';src:url('${absoluteUrl(fonts.belleza)}') format('woff2');font-weight:400;font-display:swap;}` +
        `@font-face{font-family:'Sanaa Persian';src:url('${absoluteUrl(fonts.vazirRegular)}') format('truetype');font-weight:400;font-display:swap;}` +
        `@font-face{font-family:'Sanaa Persian';src:url('${absoluteUrl(fonts.vazirMedium)}') format('truetype');font-weight:500;font-display:swap;}` +
        `@font-face{font-family:'Sanaa Persian';src:url('${absoluteUrl(fonts.vazirBold)}') format('truetype');font-weight:700;font-display:swap;}`;

    const printCss =
        fontFaces +
        "html,body{margin:0;padding:0;background:#F3EFE8;}" +
        "body{font-family:'Sanaa Persian',Tahoma,Arial,sans-serif;color:#201B1D;-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
        ".admin-invoice-f{width:100%;max-width:640px;min-height:0;margin:0 auto;background:#F3EFE8;overflow:hidden;direction:rtl;}" +
        ".admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;}" +
        ".admin-invoice-f__band{min-height:148px;padding:30px 16px 20px;display:flex;flex-direction:column;align-items:center;background:#B8C2B8;text-align:center;}" +
        ".admin-invoice-f__band-logo{font-family:'Belleza',Georgia,serif;font-size:46px;line-height:1;color:#AE0F7C;letter-spacing:.13em;}" +
        ".admin-invoice-f__band-sub{margin-top:7px;font-family:'Belleza',Georgia,serif;font-size:16px;line-height:1;color:#AE0F7C;letter-spacing:.25em;}" +
        ".admin-invoice-f__card{width:calc(100% - 16px);min-height:0;margin:-1px auto 0;background:#fff;padding:0 12px 28px;page-break-inside:avoid;}" +
        ".admin-invoice-f__meta{min-height:0;padding:14px 0 13px;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid #4B4748;font-size:12px;line-height:1.9;}" +
        ".admin-invoice-f__meta-col{display:flex;flex-direction:column;min-width:0;}" +
        ".admin-invoice-f__meta-col--left{text-align:left;}" +
        ".admin-invoice-f__meta-col p{margin:0;white-space:normal;overflow-wrap:anywhere;}" +
        ".admin-invoice-f__table{width:100%;margin:22px 0 0;border-collapse:collapse;table-layout:fixed;font-size:11px;}" +
        ".admin-invoice-f__table th{height:48px;padding:6px 3px;background:#AE0F7C;color:#fff;border-left:1px solid #fff;font-size:11px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;}" +
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
        ".admin-invoice-f__footer{padding:22px 16px 24px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:#F3EFE8;color:#AE0F7C;}" +
        ".admin-invoice-f__contact-f{font-family:Arial,Tahoma,sans-serif;font-size:11px;line-height:1.7;text-align:left;}" +
        ".admin-invoice-f__contact-f p{margin:0;}" +
        ".admin-invoice-f__thanks-f{margin:0;font-size:17px;font-weight:700;text-align:right;white-space:normal;}" +
        "@media(min-width:701px){.admin-invoice-f{width:640px;}.admin-invoice-f__band{height:203px;min-height:203px;padding:42px 24px 26px;}.admin-invoice-f__band-logo{font-size:64px;letter-spacing:.16em;}.admin-invoice-f__band-sub{font-size:22px;letter-spacing:.34em;}.admin-invoice-f__card{width:630px;padding:0 18px 36px;}.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;gap:30px;font-size:15px;line-height:1.8;}.admin-invoice-f__meta-col p{white-space:nowrap;}.admin-invoice-f__table{margin-top:30px;font-size:14px;}.admin-invoice-f__table th{height:64px;padding:8px 7px;font-size:15px;border-left:2px solid #fff;}.admin-invoice-f__table td{height:62px;padding:8px 7px;font-size:14px;}.admin-invoice-f__summary-wrap{margin-top:42px;align-items:flex-start;}.admin-invoice-f__summary{width:315px;max-width:none;}.admin-invoice-f__footer{min-height:120px;padding:28px 0 0;flex-direction:row;justify-content:space-between;gap:30px;}.admin-invoice-f__contact-f{font-size:14px;}.admin-invoice-f__thanks-f{font-size:22px;white-space:nowrap;}}" +
        "@media(max-width:360px){.admin-invoice-f__meta{grid-template-columns:1fr;gap:5px;}.admin-invoice-f__meta-col--left{text-align:right;}.admin-invoice-f__table,.admin-invoice-f__table td{font-size:10px;}.admin-invoice-f__table th{font-size:10px;padding-left:2px;padding-right:2px;}.invoice-summary-row-f{font-size:11px;}}" +
        "@page{size:A4 portrait;margin:0;}@media print{html,body{width:100%;background:#F3EFE8!important;}body{margin:0!important;padding:0!important;}.admin-invoice-f{width:640px!important;max-width:none!important;margin:0 auto!important;}.admin-invoice-f__band{height:203px!important;min-height:203px!important;padding:42px 24px 26px!important;}.admin-invoice-f__band-logo{font-size:64px!important;}.admin-invoice-f__band-sub{font-size:22px!important;}.admin-invoice-f__card{width:630px!important;padding:0 18px 36px!important;}.admin-invoice-f__meta{display:flex!important;min-height:92px!important;padding:17px 0 15px!important;gap:30px!important;font-size:15px!important;}.admin-invoice-f__meta-col p{white-space:nowrap!important;}.admin-invoice-f__table{margin-top:30px!important;font-size:14px!important;}.admin-invoice-f__table th{height:64px!important;padding:8px 7px!important;font-size:15px!important;}.admin-invoice-f__table td{height:62px!important;padding:8px 7px!important;font-size:14px!important;}.admin-invoice-f__summary-wrap{margin-top:42px!important;align-items:flex-start!important;}.admin-invoice-f__summary{width:315px!important;max-width:none!important;}.admin-invoice-f__footer{min-height:120px!important;padding:28px 0 0!important;flex-direction:row!important;justify-content:space-between!important;gap:30px!important;}.admin-invoice-f__contact-f{font-size:14px!important;}.admin-invoice-f__thanks-f{font-size:22px!important;white-space:nowrap!important;}}";

    const printWindow = window.open("", "_blank", "width=850,height=1000");

    if (!printWindow) {
        return;
    }

    printWindow.document.write(
        "<!DOCTYPE html>" +
        '<html lang="fa" dir="rtl"><head><meta charset="UTF-8">' +
        `<base href="${window.location.origin}/">` +
        "<title>فاکتور — Sanaa</title>" +
        `<style>${printCss}</style>` +
        "</head><body>" + printContent.outerHTML + "</body></html>"
    );

    printWindow.document.close();

    printWindow.addEventListener("load", () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    });
}


function initOrderInvoicePrint() {

    const printBtn = document.getElementById("orderInvoicePrintF");

    if (!printBtn) {
        return;
    }

    printBtn.addEventListener("click", printOrderInvoice);
}


// ========================================
// Init
// ========================================

function initCustomerPanel() {

    initCustomerTabs();
    initProfileForm();
    initChangePasswordForm();
    initOrderList();
    initOrderModal();
    initOrderInvoicePrint();
}