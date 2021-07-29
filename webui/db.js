const {Client} = require('pg');

async function select(client, command) {
    await client.connect();
    const res = await client.query(command);
    await client.end();
    return res;
}

class PGCommunicator {
    constructor(httpserver, loggedUsers, log) {
        console.assert(httpserver !== null);
        console.assert(loggedUsers != null);

        this.loggedUsers = loggedUsers;
        this.httpserver = httpserver;
        this.log = log;
    }

    #login(req, res) {
        const body = req.body;
        console.log('user try to log in' + body);
        const client = new Client({
            user: body.username,
            host: 'localhost',
            database: body.dbname,
            password: body.password,
            port: 5432,
        });

        select(client, 'SELECT NOW();')
            .then(sqlRes => {
                res.json({type: 'res', data: sqlRes.rows});
                this.loggedUsers.tokenToUsrData[req.query.token] = {
                        dbName: body.dbname,
                        password: body.password,
                        username: body.username,
                        date: sqlRes.rows[0],
                    }

                console.log(this.loggedUsers);
            }).catch(e => {
                res.json({type: 'err', data: e.code})
        });
    }
    #logout(req, res) {
        let found = false
        if (this.loggedUsers.tokenToUsrData[req.query.token]) {
            found = true;
            this.loggedUsers.tokenToUsrData[req.query.token] = null;
        }
        if (found) {
            res.json({type: 'res', data: 'OK'});
        } else {
            res.json({type: 'err', data: 'NOUSER'});
        }
    }

    async #execQuery(req, res, query) {
        const body = req.body;
            const clientData = this.loggedUsers.tokenToUsrData[req.query.token];
    
            if (clientData) {
                const confClient = {
                    user: clientData.username,
                    host: 'localhost',
                    database: clientData.dbName,
                    password: clientData.password,
                    port: 5432,
                }
                const client = new Client(confClient);
    
                select(client, query)
                    .then(sqlRes => {
                        res.json({type: 'res', data: sqlRes.rows});
                    }).catch(e => {
                    res.json({type: 'err', data: e.code});
                })
            } else {
                console.log('invalid token or no such user')
                res.json({type: 'err', data: 'invalid token or no such user'});
            }
    }

    #RCTHomepage(req, res) {
        this.#execQuery(req, res, 'SELECT * from periods;');
    }

    #RCTRuns(req, res) {
        this.#execQuery(req, res, 'SELECT * from runs;');
    }
    
    #RCTflags(req, res) {
        this.#execQuery(req, res, 'SELECT * from flags;');
    }

    #RCTbfields(req, res) {
        this.#execQuery(req, res, 'SELECT * from b_fields;');
    }

    #RCTmc(req, res) {
        this.#execQuery(req, res, 'SELECT * from mc;');
    }

    bindLogging(name) {
        this.httpserver.post(name, (req, res) => this.#login(req, res));
    }
    bindLogout(name) {
        this.httpserver.post(name, (req, res) => this.#logout(req, res));
    }

    bindRCTHomepage(name) {
        this.httpserver.post(name, (req, res) => this.#RCTHomepage(req, res));
    }
    bindRCTRuns(name) {
        this.httpserver.post(name, (req, res) => this.#RCTRuns(req, res));
    }
    bindRCTmc(name) {
        this.httpserver.post(name, (req, res) => this.#RCTmc(req, res));
    }
    bindRCTflags(name) {
        this.httpserver.post(name, (req, res) => this.#RCTflags(req, res));
    }
    bindRCTbfields(name) {
        this.httpserver.post(name, (req, res) => this.#RCTbfields(req, res));
    }

}

module.exports = PGCommunicator;