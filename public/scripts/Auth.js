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
            const credential = new PasswordCredential({
                id: user.email,
                password: user.password,
                name: user.name,
            });
            navigator.credentials.store(credential);
            try {
                navigator.credentials.store(credential);
            } catch (e) {
                console.log(e);
            }
        }
    },
    loginFromGoogle: async (data) => {
        const response = await API.loginFromGoogle({ credential: data.credential });
        Auth.postLogin(response, {
            name: response.name,
            email: response.email,
        });
    },
    register: async (event) => {
        event.preventDefault();
        const user = {
            name: document.getElementById("register_name").value,
            email: document.getElementById("register_email").value,
            password: document.getElementById("register_password").value,
        };
        const response = await API.register(user);
        Auth.postLogin(response, user);
    },
    checkAuthOptions: async () => {
        const response = await API.checkAuthOptions({
            email: document.getElementById("login_email").value,
        });
        Auth.loginStep = 2;
        if (response.password) {
            document.getElementById("login_section_password").hidden = false;
        }
        if (response.webauthn) {
            document.getElementById("login_section_webauthn").hidden = false;
        }
    },
    addWebAuthn: async () => {
        const options = await API.webAuthn.registrationOptions();
        options.authenticatorSelection.residentKey = "required";
        options.authenticatorSelection.requireResidentKey = true;
        options.extensions = {
            credProps: true,
        };

        const authRes = await SimpleWebAuthnBrowser.startRegistration(options);
        const verificationRes = await API.webAuthn.registrationVerification(
            authRes,
        );
        if (verificationRes.ok) {
            alert("You can now login with webAuthn");
        } else {
            alert(verificationRes.message);
        }
    },
    webAuthnLogin: async () => {
        const email = document.getElementById("login_email").value;
        const options = await API.webAuthn.loginOptions(email);
        const loginRes = await SimpleWebAuthnBrowser.startAuthentication(options);
        const verificationRes = await API.webAuthn.loginVerification(email, loginRes);
        if (verificationRes) {
            Auth.postLogin(verificationRes, verificationRes.user);
        } else {
            alert(verificationRes.message)
        }
    },
    login: async (event) => {
        event?.preventDefault();

        if (Auth.loginStep == 1) {
            Auth.checkAuthOptions();
        } else {
            const credentials = {
                email: document.getElementById("login_email").value,
                password: document.getElementById("login_password").value,
            };
            const response = await API.login(credentials);
            Auth.postLogin(response, {
                email: response.email,
                name: response.name,
            });
        }
    },
    autlogin: async () => {
        if (window.PasswordCredential) {
            const credential = await navigator.credentials.get({ password: true });
            if (credential) {
                document.getElementById("login_email").value = credential.id;
                document.getElementById("login_password").value = credential.password;
                Auth.login();
            }
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
            document
                .querySelectorAll(".logged_out")
                .forEach((e) => (e.style.display = "none"));
            document
                .querySelectorAll(".logged_in")
                .forEach((e) => (e.style.display = "block"));
            document
                .querySelectorAll(".account_name")
                .forEach((e) => (e.innerHTML = Auth.account.name));
            document
                .querySelectorAll(".account_username")
                .forEach((e) => (e.innerHTML = Auth.account.email));
        } else {
            document
                .querySelectorAll(".logged_out")
                .forEach((e) => (e.style.display = "block"));
            document
                .querySelectorAll(".logged_in")
                .forEach((e) => (e.style.display = "none"));
        }
    },
    loginStep: 1,
    init: () => {
        document.getElementById("login_section_password").hidden = true;
        document.getElementById("login_section_webauthn").hidden = true;
    },
};
Auth.updateStatus();
Auth.autlogin();

export default Auth;

// make it a global object
window.Auth = Auth;
