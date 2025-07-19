const axios = require('axios');
const { removeSubdomain } = require('../utils/cloudflare');

/**
 * Checa a cada 3 horas todos usuários do banco.
 * Se o usuário do GitHub foi apagado ou mudou de nome, remove do banco + remove DNS.
 */
function startGithubCleanupJob(db) {
    async function checkAllUsers() {
        const users = await db.collection('users').find({}).toArray();
        for (const user of users) {
            try {
                // Consulta GitHub API
                const res = await axios.get(`https://api.github.com/user/${user.githubId}`, {
                    headers: {
                        Authorization: `Bearer ${user.github_token}`
                    }
                });
                if (res.data.login !== user.username) {
                    // Username mudou
                    await removeSubdomain(user.username);
                    await db.collection('users').deleteOne({ username: user.username });
                    console.log(`[Cleanup] Username mudou, removido: ${user.username}`);
                }
            } catch (err) {
                // Se erro 404 ou 401, remove
                if (err.response && (err.response.status === 404 || err.response.status === 401)) {
                    await removeSubdomain(user.username);
                    await db.collection('users').deleteOne({ username: user.username });
                    console.log(`[Cleanup] Conta removida do GitHub, removido: ${user.username}`);
                }
            }
        }
    }
    // Executa a cada 3 horas
    setInterval(checkAllUsers, 3 * 60 * 60 * 1000);
    // Executa já na inicialização
    checkAllUsers();
}

module.exports = { startGithubCleanupJob };