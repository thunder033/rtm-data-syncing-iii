'use strict';
/**
 * Created by Greg on 2/17/2017.
 */

import * as express from 'express';
import * as http from 'http';
import * as Q from 'q';
import * as fs from 'fs';

export class ExpressServer {

    private static readonly MIME_TYPES: {
        'html': 'text/html',
        'js': 'text/javascript',
        'png': 'image/png',
        'css': 'text/css',
    };

    private server: http.Server;
    private app: express.Application;
    private readonly port: number = process.env.PORT || process.env.NODE_PORT || 3000;

    private readFileAsync: Function;

    private static getMimeType(fileName: string): string {
        const extension: string = fileName.split('.').pop();
        return ExpressServer.MIME_TYPES[extension];
    }

    constructor(routes: Object) {
        this.app = express();
        this.app.all('/', (req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'X-Request-With');
            next();
        });

        this.server = http.createServer(this.app);
        this.server.listen(this.port);

        this.config();
        this.routes(routes);
    }

    public getServer(): http.Server {
        return this.server;
    }

    private config() {
        this.readFileAsync = Q.denodeify(fs.readFile);
    }

    private routes(routes: Object): void {
        Object.keys(routes).forEach((route: string) => {
            console.log(`set route for ${route}`);
            this.app.get(route, (req: express.Request, res: express.Response, next: express.NextFunction) => {
                console.log(req.url);
                res.sendFile(routes[route], {root: `${__dirname}/../`});
            });
        });
    }
}
