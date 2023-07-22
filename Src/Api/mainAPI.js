const { QuickDB } = require('quick.db');
const axios = require('axios').default;
const crypto = require('crypto');

let db;

const setupDatabase = async () => {
    db = new QuickDB();
    return db;
}

const saveSetting = async (settingName, settingValue) => {
    if (!db) {
        db = await setupDatabase();
    }
    const settings = await db.get('settings') || {};
    const foundSetting = Object.values(settings).find((setting) => setting.name === settingName);

    if (foundSetting) {
        foundSetting.id = settingValue;
        await db.set('settings', settings);

        return { status: 'Overwrite', settingName: settingName, settingValue: settingValue };
    } else {
        settings[settingName] = { name: settingName, id: settingValue };
        await db.set('settings', settings);

        return { status: 'Saved', settingName, settingValue };
    }
}

const saveUniverse = async (universeName, universeID) => {
    if (!db) {
        db = await setupDatabase();
    }
    const universes = await db.get('universes') || {};

    if (Object.values(universes).find((universe) => universe.name === universeName)) {
        return { status: false, reason: `Universe named ${universeName} already exists`}
    }

    universes[universeID] = { name: universeName, id: universeID }
    await db.set('universes', universes)

    return true;
}

const removeUniverse = async (identifier) => {
    if (!db) {
        db = await setupDatabase();
    }

    const settings = await db.get('universes') || {};

    const matchKey = Object.keys(settings).find(key =>
        (typeof settings[key].name === 'string' && settings[key].name.toLowerCase() === identifier.toLowerCase()) ||
        (typeof settings[key].id === 'string' && settings[key].id === identifier)
    ); 

    if (!matchKey) {
        return false;
    }

    const { name, id } = settings[matchKey];
    delete settings[matchKey];
    await db.set('universes', settings);
    return { Name: name, ID: id };
}

const returnUniverses = async () => {
    if (!db) {
        db = await setupDatabase();
    }

    const universes = await db.get('universes') || {};
    return Object.values(universes).map((universe) => ({
        name: universe.name,
        id: universe.id
    }));
};

const returnDataKey = async (key) => {
    if (!db) {
        db = await setupDatabase();
    }
    const settings = await db.get('settings') || {};
    const dataKey = Object.values(settings).find((setting) => setting.name === key);

    if (dataKey) {
        return dataKey.id;
    }
    return false;
}

const getAvatarUrl = async (userId) => {
    const robloxResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
    const avatarUrl = robloxResponse.data.data[0].imageUrl;

    if (avatarUrl) {
        return avatarUrl;
    }
  
    return false;
};

const validatePlayer = async (userToCheck, userOrID) => {
    let baseURL = '';

    if (typeof userOrID === 'string') {
        baseURL = `https://users.roblox.com/v1/usernames/users`;
    } else {
        baseURL = `https://api.roblox.com/users/${userToCheck}`;
    }
    let body = {
      "usernames": [userToCheck],
      "excludeBannedUsers": false
    }
    
    try {
        const response = await axios.post(baseURL, body);
        const returnedData = response.data.data[0];
        if (returnedData.id !== undefined) {
        
            return {id: returnedData.id, name: returnedData.name};
        } else {
            return false;
        }
    } catch (error) {
        return (`Error with name check API: ${error.message}`);
    }
};

const settingCheck = async () => {
    const msgServAPIKey = await returnDataKey('msgServAPIKey');
    const datastoreApiKey = await returnDataKey('datastoreAPIKey');

    if (!msgServAPIKey) {
        return false;
    }

    if (!datastoreApiKey) {
        return false;
    }
    return true;
}

const handleMessageServiceAPI = async (Data, Topic, UniverseID) => {
    const msgServAPIKey = await returnDataKey('msgServAPIKey')

    const jsonData = JSON.stringify(Data)
    try {
        const response = await axios.post(
            `https://apis.roblox.com/messaging-service/v1/universes/${UniverseID}/topics/${Topic}`,
            {
                "message": jsonData
            },
            {
                headers: {
                    'x-api-key': msgServAPIKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            return true;
        } else {
            return `**Error:** An unknown issue has occurred.`;
        }
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                return (`**Error:** API key not valid for operation, user does not have authorization`);
            } else if (status === 403) {
                return (`**Error:** Publish is not allowed on the universe.`);
            } else if (status === 500) {
                return (`**Error:** Server internal error / Unknown error.`);
            } else if (status === 400) {
                if (error.response.data === "requestMessage cannot be longer than 1024 characters. (Parameter 'requestMessage')") {
                    return (`**Error:** The request message cannot be longer than 1024 characters.`);
                }
                console.log(error.response.data);
                return (`**Error:** Bad request.`);
            } else {
                return (`**Error:** An unknown issue has occurred.`);
            }
        } else {
            return (`Error with messageService API | ${error.message}`);
        }
    }
}

const handleDatastoreAPI = async (entryKey, data, universeID) => {
    const datastoreApiKey = await returnDataKey('datastoreAPIKey')
    const JSONValue = JSON.stringify(data);
    const contentMD5 = crypto.createHash("md5").update(JSONValue).digest("base64");

    try {
        const response = await axios.post(`https://apis.roblox.com/datastores/v1/universes/${universeID}/standard-datastores/datastore/entries/entry`, JSONValue, {
            params: {
                "datastoreName": "DTR_Testing001",
                "entryKey": entryKey
            },
            headers: {
                "x-api-key": datastoreApiKey,
                "content-md5": contentMD5,
                "content-type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        return (`Error with datastore API | ${error.message}`);
    }
};

module.exports = { getAvatarUrl, handleDatastoreAPI, handleMessageServiceAPI, removeUniverse, returnDataKey, returnUniverses, saveSetting, saveUniverse, settingCheck, validatePlayer }