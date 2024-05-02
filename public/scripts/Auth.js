import API from "./API.js";
import Router from "./Router.js";

const Auth = {
    isLoggedIn: false,
    account: null,
    postLogin: (response, user) => {
        if (response.ok) {
            Auth.isLoggedIn = true;
            Auth.account = user;
            Auth.updateStatus();
            Router.go("/account");
        } else {
            alert(response.message); // usually ui lib would be used, not base alert
        }
        // Credential Management API storage
        if (window.PasswordCredential && user.password) {
            const credential = new PasswordCredential({ id: user.email, password: user.password, name: user.name });
            navigator.credentials.store(credential);
            try {
                navigator.credentials.store(credential);
            } catch (e) {
                console.log(e);
            }
        }
    },
    loginFromGoogle: async (data) => {
        const response = await API.loginFromGoogle({ credential: data.credential});
        Auth.postLogin(response,
            {
                name: response.name,
                email: response.email
            });

    },
    register: async (event) => {
        event.preventDefault();
        const user = {
            name: document.getElementById("register_name").value,
            email: document.getElementById("register_email").value,
            password: document.getElementById("register_password").value
        };
        const response = await API.register(user);
        Auth.postLogin(response, user);
    },
    login: async (event) => {
        event?.preventDefault();
        const credentials = {
            email: document.getElementById("login_email").value,
            password: document.getElementById("login_password").value
        };
        const response = await API.login(credentials);
        Auth.postLogin(response, {
            email: response.email,
            name: response.name
        });
    },
    autlogin: async () => {
        if (window.PasswordCredential) {
            const credential = await navigator.credentials.get({ password: true });
            document.getElementById("login_email").value = credential.id;
            document.getElementById("login_password").value = credential.password;
            Auth.login();
        }
    },
    logout: () => {
        Auth.isLoggedIn = false;
        Auth.account = null;
        Auth.updateStatus();
        Router.go("/");
        if (window.PasswordCredential) {
            navigator.credentials.preventSilentAccess();
        }
    },
    updateStatus() {
        if (Auth.isLoggedIn && Auth.account) {
            document.querySelectorAll(".logged_out").forEach(
                e => e.style.display = "none"
            );
            document.querySelectorAll(".logged_in").forEach(
                e => e.style.display = "block"
            );
            document.querySelectorAll(".account_name").forEach(
                e => e.innerHTML = Auth.account.name
            );
            document.querySelectorAll(".account_username").forEach(
                e => e.innerHTML = Auth.account.email
            );

        } else {
            document.querySelectorAll(".logged_out").forEach(
                e => e.style.display = "block"
            );
            document.querySelectorAll(".logged_in").forEach(
                e => e.style.display = "none"
            );

        }
    },
    init: () => {

    },
}
Auth.updateStatus();
Auth.autlogin();

export default Auth;

// make it a global object
window.Auth = Auth;
