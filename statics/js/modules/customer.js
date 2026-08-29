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
    shipped: "ارسال شده",
    delivered: "تحویل داده شده"
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

    event.preventDefault();

    const form = event.currentTarget;

    clearAuthError("profileForm");

    const formData = new FormData(form);

    const data = {
        phone: formData.get("phone"),
        address: formData.get("address")
    };

    if (!validateProfileForm(data)) {
        return;
    }

    const currentUser = getCurrentUser();

    if (!currentUser) {
        return;
    }

    const users = getUsers();

    const updatedUsers = users.map((user) => {

        if (user.id !== currentUser.id) {
            return user;
        }

        return {
            ...user,
            phone: data.phone.trim(),
            address: data.address.trim()
        };
    });

    saveUsers(updatedUsers);

    const updatedCurrentUser = {
        ...currentUser,
        phone: data.phone.trim(),
        address: data.address.trim()
    };

    saveCurrentUser(updatedCurrentUser);

    showAuthError(
        "اطلاعات با موفقیت ذخیره شد.",
        "profileForm"
    );
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

function validateChangePasswordForm(data, fullUser) {

    let isValid = true;

    clearFieldError("password", "old");
    clearFieldError("password", "new");

    if (!data.oldPassword || data.oldPassword !== fullUser.password) {

        setFieldError(
            "password",
            "رمز عبور فعلی صحیح نیست.",
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

    event.preventDefault();

    const form = event.currentTarget;

    clearAuthError("changePasswordForm");

    const formData = new FormData(form);

    const data = {
        oldPassword: formData.get("oldPassword"),
        newPassword: formData.get("newPassword")
    };

    const currentUser = getCurrentUser();

    if (!currentUser) {
        return;
    }

    const users = getUsers();

    const fullUser = users.find((user) => user.id === currentUser.id);

    if (!fullUser) {
        return;
    }

    if (!validateChangePasswordForm(data, fullUser)) {
        return;
    }

    const updatedUsers = users.map((user) => {

        if (user.id !== fullUser.id) {
            return user;
        }

        return {
            ...user,
            password: data.newPassword
        };
    });

    saveUsers(updatedUsers);

    form.reset();

    showAuthError(
        "رمز عبور با موفقیت تغییر کرد.",
        "changePasswordForm"
    );
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

function renderOrderList() {

    const list = document.getElementById("orderList");
    const emptyState = document.getElementById("orderEmpty");

    if (!list) {
        return;
    }

    const orders = getMockOrders();

    if (!orders.length) {

        list.hidden = true;

        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    list.innerHTML = "";

    orders.forEach((order) => {

        const total = calcOrderTotalRial(order);

        const thumbsHtml = order.items.map((item) => `
            <img
                class="order-card__thumb"
                src="${item.image}"
                alt=""
                loading="lazy"
            >
        `).join("");

        const li = document.createElement("li");

        li.innerHTML = `
            <button type="button" class="order-card" data-order-id="${order.id}">
                <div class="order-card__top">
                    <span class="order-card__number">سفارش ${order.id}</span>
                    <span class="order-status order-status--${order.status}">
                        ${ORDER_STATUS_LABELS[order.status]}
                    </span>
                </div>
                <div class="order-card__thumbs">
                    ${thumbsHtml}
                </div>
                <div class="order-card__bottom">
                    <span class="order-card__date">${order.date}</span>
                    <span class="order-card__total">${formatRial(total)}</span>
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

function openOrderModal(orderId) {

    const order =
        getMockOrders().find((item) => item.id === orderId);

    if (!order) {
        return;
    }

    const modal = document.getElementById("orderModal");
    const title = document.getElementById("orderModalTitle");
    const body = document.getElementById("orderModalBody");

    if (!modal || !title || !body) {
        return;
    }

    title.textContent = `فاکتور سفارش ${order.id}`;

    const itemsSubtotalUSD = calcItemsSubtotalUSD(order.items);
    const itemsSubtotalRial = itemsSubtotalUSD * USD_TO_RIAL;
    const grandTotal = calcOrderTotalRial(order);

    const itemsHtml = order.items.map((item) => `
        <div class="invoice-item">
            <img class="invoice-item__image" src="${item.image}" alt="" loading="lazy">
            <div class="invoice-item__info">
                <div class="invoice-item__name">${item.name}</div>
                <div class="invoice-item__qty">تعداد: ${item.qty.toLocaleString("fa-IR")}</div>
            </div>
            <span class="invoice-item__price" dir="ltr">${formatUSD(item.priceUSD * item.qty)}</span>
        </div>
    `).join("");

    body.innerHTML = `
        <div class="invoice-meta">
            <span>تاریخ ثبت سفارش: ${order.date}</span>
            <span>وضعیت: ${ORDER_STATUS_LABELS[order.status]}</span>
        </div>

        <div class="invoice-items">
            ${itemsHtml}
        </div>

        <div class="invoice-summary">
            <div class="invoice-summary__row">
                <span>جمع کل (دلار)</span>
                <span dir="ltr">${formatUSD(itemsSubtotalUSD)}</span>
            </div>
            <div class="invoice-summary__row">
                <span>جمع کل (ریال)</span>
                <span>${formatRial(itemsSubtotalRial)}</span>
            </div>
            <div class="invoice-summary__row">
                <span>باربری</span>
                <span>${order.shipping ? formatRial(order.shipping) : "رایگان"}</span>
            </div>
            <div class="invoice-summary__row">
                <span>خدمات</span>
                <span>${formatRial(order.services)}</span>
            </div>
            <div class="invoice-summary__row invoice-summary__row--total">
                <span>مجموع کل</span>
                <span>${formatRial(grandTotal)}</span>
            </div>
        </div>
    `;

    modal.hidden = false;
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