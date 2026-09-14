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

    return value.toLocaleString("fa-IR") + " ریال";
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

        title.textContent = `فاکتور سفارش ${toPersianDigits(order.id)}`;

        const itemsSubtotalUSD = order.items.reduce(
            (sum, item) => sum + (item.priceUSD * item.qty),
            0
        );

        const itemsSubtotalRial =
            itemsSubtotalUSD * USD_TO_RIAL;

        const grandTotal = order.totalIRR;

        const itemRowsHtml = order.items.map((item) => {

            const metaBits = [];

            if (item.brand) {
                metaBits.push(`برند: ${escapeHtml(item.brand)}`);
            }

            if (item.size) {
                metaBits.push(`سایز: ${escapeHtml(item.size)}`);
            }

            return `
                <tr>
                    <td>
                        <div class="customer-invoice__product">

                            ${
                                item.image
                                ? `
                                    <img
                                        class="customer-invoice__product-img"
                                        src="${item.image}"
                                        alt=""
                                        loading="lazy"
                                    >
                                `
                                : `<div class="customer-invoice__product-img customer-invoice__product-img--placeholder"></div>`
                            }

                            <div class="customer-invoice__product-info">

                                <span class="customer-invoice__product-name">
                                    ${escapeHtml(item.name)}
                                </span>

                                ${
                                    metaBits.length
                                    ? `<span class="customer-invoice__product-meta">${metaBits.join(" · ")}</span>`
                                    : ""
                                }

                                ${
                                    item.description
                                    ? `<span class="customer-invoice__product-desc">${escapeHtml(item.description)}</span>`
                                    : ""
                                }

                            </div>

                        </div>
                    </td>

                    <td data-num>
                        ${item.qty.toLocaleString("fa-IR")}
                    </td>

                    <td data-num>
                        ${formatRial(item.priceUSD * item.qty * USD_TO_RIAL)}
                    </td>
                </tr>
            `;

        }).join("");

        body.innerHTML = `

            <div class="customer-invoice">

                <div class="customer-invoice__brand">
                    <span class="customer-invoice__logo" dir="ltr">SANAA</span>
                    <span class="customer-invoice__badge">فاکتور مشتری</span>
                </div>

                <dl class="customer-invoice__meta">

                    <div class="customer-invoice__meta-row">
                        <dt>شماره سفارش</dt>
                        <dd>${toPersianDigits(order.id)}</dd>
                    </div>

                    <div class="customer-invoice__meta-row">
                        <dt>تاریخ ثبت سفارش</dt>
                        <dd>${toPersianDigits(order.date)}</dd>
                    </div>

                    <div class="customer-invoice__meta-row">
                        <dt>وضعیت سفارش</dt>
                        <dd>${ORDER_STATUS_LABELS[order.status] || order.status}</dd>
                    </div>

                </dl>

                <div class="customer-invoice__table-wrap">

                    <table class="customer-invoice__table">

                        <thead>
                            <tr>
                                <th>محصول</th>
                                <th>تعداد</th>
                                <th>جمع (ریال)</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${itemRowsHtml}
                        </tbody>

                    </table>

                </div>

                <div class="customer-invoice__summary">

                    <div class="customer-invoice__summary-row">
                        <span>جمع کل محصولات</span>
                        <span>${formatRial(itemsSubtotalRial)}</span>
                    </div>

                    <div class="customer-invoice__summary-row">
                        <span>باربری</span>
                        <span>
                            ${
                                order.shipping
                                ? formatRial(order.shipping)
                                : "رایگان"
                            }
                        </span>
                    </div>

                    <div class="customer-invoice__summary-row">
                        <span>خدمات</span>
                        <span>${formatRial(order.services)}</span>
                    </div>

                    <div class="customer-invoice__summary-row customer-invoice__summary-row--total">
                        <span>مجموع کل</span>
                        <span>${formatRial(grandTotal)}</span>
                    </div>

                </div>

                <p class="customer-invoice__footer-note">
                    این فاکتور بر اساس نرخ ارز لحظه‌ی ثبت سفارش صادر شده است — فروشگاه سنا
                </p>

            </div>
        `;

        modal.hidden = false;

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