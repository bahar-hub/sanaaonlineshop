// ========================================
// Sanaa Authentication
// ========================================


// ========================================
// Default Users
// ========================================

const DEFAULT_USERS = [
    {
        id: 1,
        firstName: "Sanaa",
        lastName: "Admin",
        phone: "",
        address: "",
        username: "admin",
        password: "123456",
        role: "admin"
    },

    {
        id: 2,
        firstName: "Sanaa",
        lastName: "Customer",
        phone: "",
        address: "",
        username: "customer",
        password: "123456",
        role: "customer"
    }
];


// ========================================
// Initialize Users
// ========================================

function initializeUsers() {

    const users = getUsers();


    if (users.length > 0) {
        return;
    }


    saveUsers(DEFAULT_USERS);
}


// ========================================
// Generate User ID
// ========================================

function generateUserId(users) {

    if (!users.length) {
        return 1;
    }


    return Math.max(
        ...users.map((user) => user.id)
    ) + 1;
}


// ========================================
// Login
// ========================================

function login(username, password) {

    const users = getUsers();


    const normalizedUsername =
        username.trim().toLowerCase();


    const user = users.find((item) => {

        return (
            item.username.toLowerCase() ===
            normalizedUsername &&
            item.password === password
        );

    });


    if (!user) {

        return {
            success: false,
            error: "INVALID_CREDENTIALS",
            user: null
        };

    }


    const currentUser = sanitizeUser(user);


    saveCurrentUser(currentUser);


    return {
        success: true,
        error: null,
        user: currentUser
    };
}


// ========================================
// Signup
// ========================================

function signup(userData) {

    const users = getUsers();


    const normalizedUsername =
        userData.username
            .trim()
            .toLowerCase();


    const usernameExists =
        users.some((user) => {

            return (
                user.username.toLowerCase() ===
                normalizedUsername
            );

        });


    if (usernameExists) {

        return {
            success: false,
            error: "USERNAME_EXISTS",
            user: null
        };

    }


    const phoneExists =
        users.some((user) => {

            return (
                user.phone &&
                user.phone === userData.phone
            );

        });


    if (phoneExists) {

        return {
            success: false,
            error: "PHONE_EXISTS",
            user: null
        };

    }


    const newUser = {

        id: generateUserId(users),

        firstName:
            userData.firstName.trim(),

        lastName:
            userData.lastName.trim(),

        phone:
            userData.phone.trim(),

        address:
            userData.address.trim(),

        username:
            normalizedUsername,

        password:
            userData.password,

        role: "customer"

    };


    users.push(newUser);

    saveUsers(users);


    const currentUser =
        sanitizeUser(newUser);


    saveCurrentUser(currentUser);


    return {
        success: true,
        error: null,
        user: currentUser
    };
}


// ========================================
// Logout
// ========================================

function logout() {

    removeCurrentUser();
}


// ========================================
// Authentication State
// ========================================

function isAuthenticated() {

    return getCurrentUser() !== null;
}


// ========================================
// User Sanitization
// ========================================

function sanitizeUser(user) {

    const {
        password,
        ...safeUser
    } = user;


    return safeUser;
}


// ========================================
// Initialize Auth
// ========================================

function initAuth() {

    initializeUsers();

}