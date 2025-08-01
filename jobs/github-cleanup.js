const axios = require('axios');
const { removeSubdomain } = require('../utils/cloudflare');

function startGithubCleanupJob(db) {
    async function checkAllUsers() {
        const users = await db.collection('users').find({}).toArray();
        for (const user of users) {
            try {
                const res = await axios.get(`https://api.github.com/user/${user.githubId}`, {
                    headers: {
                        Authorization: `Bearer ${user.github_token}`
                    }
                });
                if (res.data.login !== user.username) {
                    await removeSubdomain(user.username);
                    await db.collection('users').deleteOne({ username: user.username });
                    console.log(`[Cleanup] Username changed, removed: ${user.username}`);
                }
            } catch (err) {
                if (err.response && (err.response.status === 404 || err.response.status === 401)) {
                    await removeSubdomain(user.username);
                    await db.collection('users').deleteOne({ username: user.username });
                    console.log(`[Cleanup] GitHub account removed, deleted: ${user.username}`);
                }
            }
        }
    }
    setInterval(checkAllUsers, 3 * 60 * 60 * 1000);
    checkAllUsers();
}

module.exports = { startGithubCleanupJob };
