const express = require("express");

const app = express();

app.use(express.json());

// ==========================================
// CONFIG
// ==========================================

const PORT = process.env.PORT || 3000;
const ROBLOX_TOKEN = process.env.ROBLOX_TOKEN || "";

// ==========================================
// DONATION QUEUE
// ==========================================

const donationQueue = [];
const processedTransactions = new Set();

// ==========================================
// HELPER
// ==========================================

function cleanString(value) {
    return String(value ?? "").trim();
}

// ==========================================
// HOME / STATUS
// ==========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        service: "BagiBagi → Roblox Webhook",
        status: "online"
    });
});

// ==========================================
// BAGIBAGI WEBHOOK
// ==========================================

app.post("/bagibagi-webhook", (req, res) => {

    try {

        const body = req.body || {};

        const transactionId = cleanString(body.transaction_id);
        const senderName = cleanString(body.name) || "Unknown";
        const amount = Number(body.amount) || 0;
        const message = cleanString(body.message);

        // Cek transaction ID
        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "transaction_id missing"
            });
        }

        // Cegah transaksi masuk dua kali
        if (processedTransactions.has(transactionId)) {
            return res.json({
                success: true,
                duplicate: true
            });
        }

        processedTransactions.add(transactionId);

        // Masukkan donasi ke antrean Roblox
        donationQueue.push({
            sender_name: senderName,
            amount: amount,
            message: message,
            transaction_id: transactionId,
            created_at: body.created_at || new Date().toISOString()
        });

        console.log(
            `[DONASI] ${senderName} - Rp${amount} - ${message}`
        );

        return res.json({
            success: true,
            received: true
        });

    } catch (error) {

        console.error("Webhook error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// ==========================================
// ROBLOX POLLING
// ==========================================

app.get("/roblox-cek/kosong", (req, res) => {

    const token = cleanString(req.query.token);

    // Token harus cocok dengan Railway Variable
    if (!ROBLOX_TOKEN || token !== ROBLOX_TOKEN) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }

    // Ambil semua donasi yang sedang menunggu
    const result = donationQueue.splice(0, donationQueue.length);

    // Roblox menerima ARRAY
    res.json(result);
});

// ==========================================
// QUEUE STATUS
// ==========================================

app.get("/status", (req, res) => {

    res.json({
        success: true,
        status: "online",
        queue: donationQueue.length,
        processed: processedTransactions.size
    });

});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `BagiBagi Roblox Webhook running on port ${PORT}`
    );

});
