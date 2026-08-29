// ========================================
// Sanaa Storage
// ========================================

const STORAGE_KEYS = {
    USERS: "sanaa_users",
    CURRENT_USER: "sanaa_current_user"
};


// ========================================
// Generic Storage Helpers
// ========================================

function getStorageItem(key) {

    const value = localStorage.getItem(key);

    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        console.error(
            `Failed to parse storage key: ${key}`,
            error
        );

        return null;
    }
}


function setStorageItem(key, value) {

    localStorage.setItem(
        key,
        JSON.stringify(value)
    );
}


function removeStorageItem(key) {

    localStorage.removeItem(key);
}


// ========================================
// Users
// ========================================

function getUsers() {

    return getStorageItem(
        STORAGE_KEYS.USERS
    ) || [];
}


function saveUsers(users) {

    setStorageItem(
        STORAGE_KEYS.USERS,
        users
    );
}


// ========================================
// Current User
// ========================================

function getCurrentUser() {

    return getStorageItem(
        STORAGE_KEYS.CURRENT_USER
    );
}


function saveCurrentUser(user) {

    setStorageItem(
        STORAGE_KEYS.CURRENT_USER,
        user
    );
}


function removeCurrentUser() {

    removeStorageItem(
        STORAGE_KEYS.CURRENT_USER
    );
}