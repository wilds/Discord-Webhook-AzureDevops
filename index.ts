/* Hey! 👋
Thanks for checking out the code for our Discord Webhook Forwarder
This is a pretty simple project

Feel free to open a pull-request with any improvements
If you'd like to support us, please donate at https://www.buymeacoffee.com/hyrawork
A hosted version of this project is available at https://hooks.hyra.io

All the best!
*/

import dotenv from 'dotenv';
dotenv.config();

import axios, { AxiosInstance } from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { networkInterfaces, hostname } from 'os';
import https from 'https';
import { EventCreated } from './@types/azure-devops';
import MD5 from 'crypto-js/MD5';

const nets = networkInterfaces();
const addresses = [];

// Discover the IP addresses
for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
            addresses.push(net.address);
        }
    }
}

const axiosInstances: AxiosInstance[] = []

// Create an axios instance for each IP address
/*
for (let address of addresses) {
    axiosInstances.push(axios.create({
        httpsAgent: new https.Agent({
            localAddress: address
        }),
        headers: {
            Via: "WebhookProxy/1.0"
        }
    }))
}
*/
axiosInstances.push(axios.create({
    httpsAgent: new https.Agent(),
    headers: {
        Via: "WebhookProxy/1.0"
    }
}))

// Balance the load across the instances by taking it in turns
let instance = 0;

const roundRobinInstance = (): { instance: AxiosInstance, id: number } => {
    if (instance === axiosInstances.length - 1) {
        instance = 0;
        return { instance: axiosInstances[instance], id: instance + 1 };
    } else {
        instance++;
        return { instance: axiosInstances[instance - 1], id: instance };
    }
}

// End of IP balancing

const app = express();
const port = process.env.port || 3333;

app.use(bodyParser.json({ limit: '8mb' }));
app.use(bodyParser.urlencoded({ limit: '8mb', extended: true }));

app.use((req, res, next) => {
    res.header("X-Powered-By", "WebhookProxy/1.0");
    next();
})

const toDiscordRequest = (body: EventCreated) => {

    const iconHash = MD5(body.resource.pushedBy?.uniqueName.trim().toLocaleLowerCase() || '');
    const iconURL = 'https://www.gravatar.com/avatar/' + iconHash + '?d=identicon';

    return (
        {
            embeds: [
                {
                    title: body.eventType,
                    author: {
                        name: body.resource.pushedBy?.displayName,
                        icon_url: iconURL, //body.resource.pushedBy?.imageUrl,
                    },
                    description: body.detailedMessage.markdown,
                    timestamp: body.createdDate,
                }
            ]
        }
    );
}

const handleResponse = async (req: express.Request, res: express.Response, result: any) => {
    res.setHeader("X-Request-ID", req.params.id);
    res.send(result.data);
}

app.get("/api/webhooks/:id/:token", (req, res) => {
    const { instance, id } = roundRobinInstance();

    res.setHeader("X-Machine-ID", hostname + "-" + id)
    instance.get(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.post("/api/webhooks/:id/:token", (req, res) => {
    const { instance, id } = roundRobinInstance();

    res.setHeader("X-Machine-ID", hostname + "-" + id)
    instance.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`, toDiscordRequest(req.body)).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        console.log('axiosInstances.length ' + axiosInstances.length)
        console.log(err)
        res.status(err.response?.status);
        handleResponse(req, res, err.response);
    })
})

app.patch("/api/webhooks/:id/:token/messages/:messageId", (req, res) => {
    const { instance, id } = roundRobinInstance();

    res.setHeader("X-Machine-ID", hostname + "-" + id)
    instance.patch(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`, toDiscordRequest(req.body)).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.delete("/api/webhooks/:id/:token/messages/:messageId", (req, res) => {
    const { instance, id } = roundRobinInstance();

    res.setHeader("X-Machine-ID", hostname + "-" + id)
    instance.delete(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.listen(port, () => {
    console.log(`WebhookProxy listening on port ${port}`)
})