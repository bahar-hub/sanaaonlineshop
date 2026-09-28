// ========================================
// Sanaa Customer Panel
// ========================================


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
    shipped: "ارسال شده",
    delivered: "تحویل داده شده",
    cancelled: "لغو شده"
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

    return value.toLocaleString("fa-IR") + " ریال";
}

function calcItemsSubtotalRial(items) {

    return items.reduce((sum, item) => {
        return sum + (Number(item.lineTotalIRR) || 0);
    }, 0);
}

function calcOrderTotalRial(order) {

    return calcItemsSubtotalRial(order.items) +
        (Number(order.shipping) || 0) +
        (Number(order.services) || 0);
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
                        سفارش ${order.id}
                    </span>

                    <span class="order-status order-status--${order.status}">
                        ${ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                </div>

                <div class="order-card__bottom">
                    <span class="order-card__date">
                        ${order.date}
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
// Customer Invoice
// ========================================

function toPersianDigits(value) {
    const map = {
        "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
        "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹"
    };

    return String(value == null ? "" : value).replace(/[0-9]/g, (digit) => map[digit]);
}


function customerMoneyHtml(value) {
    return `
        <span class="invoice-money-f" dir="rtl">
            <bdi class="invoice-money-f__number" dir="ltr">
                ${Math.round(Number(value) || 0).toLocaleString("fa-IR")}
            </bdi>
            <span class="invoice-money-f__label"> ریال</span>
        </span>
    `;
}


function renderCustomerInvoiceHtml(order) {

    const items = Array.isArray(order.items) ? order.items : [];

    const itemsRial = items.reduce((sum, item) => {
        return sum + (Number(item.lineTotalIRR) || 0);
    }, 0);

    const shippingRial = Number(order.shipping) || 0;

    // Keep backend total as the source of truth whenever it is available.
    const grandTotalRial =
        Number(order.totalIRR) ||
        (itemsRial + shippingRial);

    const customerName =
        (order.customer && order.customer.name) ||
        order.customerName ||
        "—";

    const paymentLabels = {
        paid: "پرداخت‌شده",
        pending: "در انتظار پرداخت",
        failed: "پرداخت ناموفق",
        partial: "پرداخت ناقص",
        cancelled: "لغوشده"
    };

    const paymentLabel =
        paymentLabels[order.paymentStatus] ||
        order.paymentLabel ||
        order.paymentStatus ||
        "—";

    const itemRows = items.map((line) => {

        const nameCell =
            '<td class="invoice-item-name">' +
                '<div class="invoice-product-cell-f">' +
                    (
                        line.image
                            ? '<img class="invoice-product-cell-f__img" src="' + line.image + '" alt="">'
                            : '<span class="invoice-product-cell-f__img invoice-product-cell-f__img--empty-f"></span>'
                    ) +
                    '<span class="invoice-product-cell-f__name">' + (line.name || '—') + '</span>' +
                '</div>' +
            '</td>';

        const rialCell =
            '<td class="invoice-price">' +
                customerMoneyHtml(line.lineTotalIRR) +
            '</td>';

        return (
            '<tr>' +
                nameCell +
                '<td>' + (line.brand || '—') + '</td>' +
                '<td>' + (line.size || '—') + '</td>' +
                '<td>' + (line.color || '—') + '</td>' +
                '<td>' + toPersianDigits(line.qty || 0) + '</td>' +
                rialCell +
            '</tr>'
        );

    }).join('');

    // This is intentionally the same CUSTOMER invoice structure/style
    // as renderInvoiceHtmlF(calc, meta, false) in admin-orders-f.js.
    return (
        '<style id="admin-invoice-reference-style-f">\n.invoice-scale-wrap-f{width:100%;overflow:hidden;display:flex;justify-content:center;align-items:flex-start;}\n.admin-invoice-f{flex:0 0 auto;transform-origin:top center;width:640px;min-height:980px;margin:0 auto;background:#F3EFE8;color:#201B1D;direction:rtl;overflow:hidden;font-family:\'Sanaa Persian\',Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}\n.admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;font-variant-numeric:tabular-nums;}\n.admin-invoice-f__band{height:200px;min-height:200px;padding:26px 24px 16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:#B9C3B9;text-align:center;}\n.admin-invoice-f__band-logo{font-family:\'Belleza\',Sanaa Persian,Georgia,serif;font-size:56px;line-height:1;color:#A61579;letter-spacing:.16em;font-weight:400;}\n.admin-invoice-f__band-sub{margin-top:8px;font-family:\'Belleza\',Sanaa Persian,Georgia,serif;font-size:19px;line-height:1;color:#A61579;letter-spacing:.34em;font-weight:400;}\n.admin-invoice-f__band-type-f{margin-top:10px;font-size:12px;color:#5C5356;font-weight:700;}\n.admin-invoice-f__card{width:90%;min-height:720px;margin:-50px auto 0;background:#fff;padding:0 18px 36px;box-shadow:0 0 0 1px rgba(0,0,0,.02);page-break-inside:avoid;}\n.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;align-items:start;gap:30px;border-bottom:1px solid #4B4748;font-size:15px;line-height:1.8;}\n.admin-invoice-f__meta-col{display:flex;flex-direction:column;gap:0;min-width:0;}\n.admin-invoice-f__meta-col--left{text-align:left;}\n.admin-invoice-f__meta-col p{margin:0;white-space:nowrap;overflow-wrap:anywhere;}\n.admin-invoice-f__table{width:100%;margin:30px 0 0;border-collapse:collapse;table-layout:fixed;font-size:14px;}\n.admin-invoice-f__table th{height:44px;padding:6px 7px;background:#A61579;color:#fff;border-left:2px solid #fff;font-size:13px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;line-height:1.2;}\n' +
        '.admin-invoice-f__table th:nth-child(1){width:28%;}.admin-invoice-f__table th:nth-child(2){width:14%;}.admin-invoice-f__table th:nth-child(3){width:11%;}.admin-invoice-f__table th:nth-child(4){width:12%;}.admin-invoice-f__table th:nth-child(5){width:9%;}.admin-invoice-f__table th:nth-child(6){width:26%;}' +
        '\n.admin-invoice-f__table th:last-child{border-left:0;}\n.admin-invoice-f__table td{min-height:62px;height:62px;padding:8px 7px;border:0;text-align:center;vertical-align:middle;font-size:14px;overflow-wrap:anywhere;word-break:break-word;}\n.admin-invoice-f__table td.invoice-item-name{text-align:right;}\n.invoice-product-cell-f{display:flex;align-items:center;gap:8px;}\n.invoice-product-cell-f__img{flex-shrink:0;width:36px;height:36px;border-radius:8px;object-fit:cover;}\n.invoice-product-cell-f__img--empty-f{background:#F3EFE8;}\n.invoice-product-cell-f__name{text-align:right;overflow-wrap:anywhere;}\n.admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}\n.invoice-money-f{display:inline-flex;align-items:baseline;gap:3px;direction:rtl;unicode-bidi:isolate;white-space:nowrap;}\n.invoice-money-f__number{display:inline-block;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap;}\n.invoice-money-f__label{display:inline-block;white-space:nowrap;}\n.invoice-price-stack-f{width:100%;display:flex;flex-direction:column;align-items:stretch;gap:5px;direction:rtl;min-width:0;}\n.invoice-price-line-f{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);align-items:baseline;gap:4px;white-space:normal;min-width:0;}\n.invoice-price-label-f{text-align:right;white-space:nowrap;}\n.invoice-price-line-f .invoice-money-f{min-width:0;max-width:100%;justify-content:flex-start;white-space:normal;flex-wrap:wrap;}\n.invoice-price-line-f .invoice-money-f__number{max-width:100%;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__summary-wrap{margin-top:42px;display:flex;flex-direction:column;align-items:flex-end;}\n.admin-invoice-f__summary{width:315px;max-width:none;margin-right:0;display:flex;flex-direction:column;gap:6px;}\n.invoice-summary-row-f{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:15px;line-height:1.65;direction:rtl;}\n.invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;text-align:left;}\n.invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:18px;font-weight:700;}\n.invoice-summary-total-f strong:first-child{font-weight:800;}\n.admin-invoice-f__footer{width:90%;margin:0 auto;min-height:120px;padding:28px 0 0;display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-wrap:nowrap;gap:30px;background:#F3EFE8;color:#A61579;}\n.admin-invoice-f__contact-f{flex:0 1 auto;min-width:0;font-family: Sanaa Persian ,Arial,Tahoma,sans-serif;font-size:14px;line-height:1.7;text-align:left;}\n.admin-invoice-f__contact-f p{margin:0;overflow-wrap:anywhere;}\n.admin-invoice-f__thanks-f{flex:0 1 auto;min-width:0;margin:0;font-size:22px;font-weight:700;text-align:right;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__footer-note{display:none;}\n</style>' +

        '<div class="invoice-scale-wrap-f">' +
            '<div class="admin-invoice-f" dir="rtl">' +

                '<div class="admin-invoice-f__band">' +
                    '<span class="admin-invoice-f__band-logo" dir="ltr">SANAA</span>' +
                    '<span class="admin-invoice-f__band-sub" dir="ltr">ONLINE SHOP</span>' +
                '</div>' +

                '<div class="admin-invoice-f__card">' +

                    '<div class="admin-invoice-f__meta">' +

                        '<div class="admin-invoice-f__meta-col">' +
                            '<p><span>مشتری :</span> ' + toPersianDigits(customerName) + '</p>' +
                            '<p><span>وضعیت پرداخت :</span> ' + paymentLabel + '</p>' +
                        '</div>' +

                        '<div class="admin-invoice-f__meta-col admin-invoice-f__meta-col--left">' +
                            '<p><span>شماره سفارش :</span> ' + toPersianDigits(order.id || '—') + '</p>' +
                            '<p><span>تاریخ صدور :</span> ' + toPersianDigits(order.date || '—') + '</p>' +
                        '</div>' +

                    '</div>' +

                    '<table class="admin-invoice-f__table">' +

                        '<thead>' +
                            '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>رنگ</th><th>تعداد</th><th>قیمت کل</th></tr>' +
                        '</thead>' +

                        '<tbody>' +
                            itemRows +
                        '</tbody>' +

                    '</table>' +

                    '<div class="admin-invoice-f__summary-wrap">' +

                        '<div class="admin-invoice-f__summary">' +

                            '<div class="invoice-summary-row-f">' +
                                '<span>جمع کل :</span>' +
                                '<span>' + Math.round(itemsRial).toLocaleString("fa-IR") + ' ریال</span>' +
                            '</div>' +

                            '<div class="invoice-summary-row-f">' +
                                '<span>هزینه باربری :</span>' +
                                '<span>' + Math.round(shippingRial).toLocaleString("fa-IR") + ' ریال</span>' +
                            '</div>' +

                            '<div class="invoice-summary-row-f invoice-summary-total-f">' +
                                '<strong>مجموع کل</strong>' +
                                '<strong>' + Math.round(grandTotalRial).toLocaleString("fa-IR") + ' ریال</strong>' +
                            '</div>' +

                        '</div>' +

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

function fitCustomerInvoiceModal() {

    const modal = document.getElementById("orderModal");

    if (!modal || modal.hidden) {
        return;
    }

    const wrap = modal.querySelector(".invoice-scale-wrap-f");
    const invoice = modal.querySelector(".admin-invoice-f");

    if (!wrap || !invoice) {
        return;
    }

    invoice.style.transform = "none";
    wrap.style.height = "auto";

    const naturalWidth = invoice.offsetWidth;
    const naturalHeight = invoice.offsetHeight;

    const body = document.getElementById("orderModalBody");
    const availableWidth = body ? body.clientWidth : window.innerWidth;
    const availableHeight = Math.max(360, window.innerHeight - 180);

    const widthScale =
        naturalWidth > 0
            ? availableWidth / naturalWidth
            : 1;

    const heightScale =
        naturalHeight > 0
            ? availableHeight / naturalHeight
            : 1;

    const scale = Math.min(1, widthScale, heightScale);

    invoice.style.transformOrigin = "top center";
    invoice.style.transform = `scale(${scale})`;

    wrap.style.height =
        Math.ceil(naturalHeight * scale) + "px";
}



// ========================================
// Order Modal
// ========================================

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

        if (!modal || !title || !body) {
            return;
        }

        title.textContent = `فاکتور سفارش ${order.id}`;

        // همان فاکتور مشتری که در پنل ادمین استفاده می‌شود،
        // بدون اطلاعات داخلی ادمین و بدون نمایش هزینه خدمات.
        body.innerHTML = renderCustomerInvoiceHtml(order);

        modal.hidden = false;

        requestAnimationFrame(() => {
            fitCustomerInvoiceModal();
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




window.addEventListener("resize", () => {
    fitCustomerInvoiceModal();
});


// ========================================
// Init
// ========================================

function initCustomerPanel() {

    initCustomerTabs();
    initProfileForm();
    initChangePasswordForm();
    initOrderList();
    initOrderModal();
}