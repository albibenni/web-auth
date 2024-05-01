import express from 'express'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import * as url from 'url';
import bcrypt from 'bcryptjs';
import * as jwtJsDecode from 'jwt-js-decode';
import base64url from "base64url";
import SimpleWebAuthnServer from '@simplewebauthn/server';
import { truncate } from 'fs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const app = express()
app.use(express.json())

const adapter = new JSONFile(__dirname + '/auth.json');
const db = new Low(adapter);
await db.read();
db.data ||= { users: [] }

const rpID = "localhost";
const protocol = "http";
const port = 5050;
const expectedOrigin = `${protocol}://${rpID}:${port}`;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

// ADD HERE THE REST OF THE ENDPOINTS

app.get("*", (req, res) => {
    res.sendFile(__dirname + "public/index.html");
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});

app.post("/auth/login-google", (req, res) => {
    const jwt = jwtJsDecode.jwtDecode(req.body.credential);
    const user = {
        email: jwt.payload.email,
        name: jwt.payload.given_name + " " + jwt.payload.family_name,
        password: undefined
    };
    const userFound = findUser(user.email);
    if (userFound) {
        user.federated = {
            google: jwt.payload.aud
        };
        db.write();
        res.send({ ok: true, name: user.name, email: user.email });
    } else {
        db.data.users.push({
            ...user,
            federated: {
                google: jwt.payload.aud
            }
        })
        db.write();
        res.send({ ok: true, name: user.name, email: user.email });
    }
    
});

app.post("/auth/login", (req, res) => {
    const user = findUser(req.body.email);
    if (user) {
        // user exists, check password
        if (bcrypt.compareSync(req.body.password, user.password)) {
            res.send({ ok: true, email: user.email, name: user.name });
        } else {
            res.send({ ok: false, message: 'Credentials are wrong.' }); // Credentials are wrong is a standard to avoid giving hakers information about what is wrong
        }
    } else {
        // User doesn't exist
        res.send({ ok: false, message: 'Credentials are wrong.' }); // Credentials are wrong is a standard to avoid giving hakers information about what is wrong
    }
});

function findUser(email) {
    const results = db.data.users.filter(u => u.email == email);
    if (results.length == 0) return undefined;
    return results[0];
}

app.post("/auth/register", (req, res) => {
    // TODO: Add validation
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(req.body.password, salt);

    const user = {
        name: req.body.name,
        email: req.body.email,
        password: hash
    };
    const userFound = findUser(req.body.email);

    if (userFound) {
        // User already registered
        res.send({ ok: false, message: 'User already exists' });
    } else {
        // New User
        db.data.users.push(user);
        db.write();
        res.send({ ok: true });
    }
});
