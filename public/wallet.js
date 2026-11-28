
const API_URL = window.location.origin;

let authToken = localStorage.getItem("authToken");

let currentPage = 1;
let totalPages = 1;

const TRANSACTIONS_PER_PAGE = 10;

if (!authToken) {
  window.location.replace("/index.html");
}

async function apiRequest(path, method = "GET", body = null) {
  const headers = {
    Authorization: `Bearer ${authToken}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "خطا در ارتباط با سرور");
  }

  return data;
}

function decimalValue(value) {
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    return value.$numberDecimal;
  }

  return value ?? "0";
}

function formatToman(value) {
  const number = Number(decimalValue(value));

  return Number.isFinite(number)
    ? `${number.toLocaleString("fa-IR")} تومان`
    : "-";
}

function formatUSDT(value) {
  const number = Number(decimalValue(value));

  return Number.isFinite(number)
    ? `${number.toLocaleString("fa-IR", {
        maximumFractionDigits: 6,
      })} USDT`
    : "-";
}

function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);

  element.textContent = message;
  element.classList.remove("message-success", "message-error");
  element.classList.add(isError ? "message-error" : "message-success");
}

async function withButtonLock(button, action) {
  button.disabled = true;

  try {
    await action();
  } finally {
    button.disabled = false;
  }
}

// Wallet

async function loadWallet() {
  const wallet = await apiRequest("/wallet");

  document.getElementById("wallet-toman").textContent =
    formatToman(wallet.amountToman);

  document.getElementById("wallet-usdt").textContent =
    formatUSDT(wallet.amountUSDT);
}

// Transaction history

const typeLabels = {
  BUY: "خرید تتر",
  SELL: "فروش تتر",
  DEPOSIT: "واریز تومان",
  WITHDRAW: "برداشت تومان",
};

const statusLabels = {
  PENDING: "در انتظار بررسی",
  PROCESSING: "در حال پردازش",
  COMPLETED: "تکمیل شده",
  REJECTED: "رد شده",
  FAILED: "ناموفق",
  CANCELLED: "لغو شده",
};

function createTransactionItem(tx) {
  const item = document.createElement("li");
  item.className = "transaction-item";

  const info = document.createElement("div");

  const title = document.createElement("div");
  title.className = "tx-title";
  title.textContent = typeLabels[tx.type] || tx.type;

  const details = document.createElement("div");
  details.className = "tx-details";

  const date = new Date(tx.createdAt);

  details.textContent = date.toLocaleString("fa-IR");

  const status = document.createElement("span");
  status.className = `status status-${tx.status}`;
  status.textContent = statusLabels[tx.status] || tx.status;

  details.appendChild(document.createElement("br"));
  details.appendChild(status);

  info.appendChild(title);
  info.appendChild(details);

  const amount = document.createElement("div");
  amount.className = "tx-amount";

  if (tx.type === "BUY" || tx.type === "SELL") {
    amount.textContent =
      `${formatUSDT(tx.amountUSDT)} / ${formatToman(tx.amountToman)}`;
  } else {
    amount.textContent = formatToman(tx.amountToman);
  }

  item.appendChild(info);
  item.appendChild(amount);

  return item;
}

async function loadTransactions() {
  const data = await apiRequest(
    `/transactions?page=${currentPage}&limit=${TRANSACTIONS_PER_PAGE}`,
  );

  const list = document.getElementById("transaction-list");
  list.replaceChildren();

  totalPages = data.pagination?.totalPages || 1;

  if (!data.transactions || data.transactions.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "هنوز تراکنشی ثبت نشده است.";
    list.appendChild(empty);
  } else {
    data.transactions.forEach((tx) => {
      list.appendChild(createTransactionItem(tx));
    });
  }

  document.getElementById("page-indicator").textContent =
    `صفحه ${currentPage} از ${totalPages}`;

  document.getElementById("prev-btn").disabled = currentPage <= 1;
  document.getElementById("next-btn").disabled =
    currentPage >= totalPages;
}

async function refreshPageData() {
  await Promise.all([
    loadWallet(),
    loadTransactions(),
  ]);
}

// Deposit

document
  .getElementById("deposit-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = document.getElementById("deposit-btn");
    const amount = document.getElementById("deposit-amount").value;

    if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
      showMessage("deposit-message", "مبلغ واردشده معتبر نیست.", true);
      return;
    }

    await withButtonLock(button, async () => {
      try {
        const result = await apiRequest("/deposit", "POST", {
          amountToman: amount,
          idempotencyKey: crypto.randomUUID(),
        });

        showMessage(
          "deposit-message",
          result.message || "واریز با موفقیت ثبت شد.",
        );

        event.target.reset();
        currentPage = 1;
        await refreshPageData();
      } catch (error) {
        showMessage("deposit-message", error.message, true);
      }
    });
  });

// Withdraw

document
  .getElementById("withdraw-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = document.getElementById("withdraw-btn");
    const amount = document.getElementById("withdraw-amount").value;

    if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
      showMessage("withdraw-message", "مبلغ واردشده معتبر نیست.", true);
      return;
    }

    await withButtonLock(button, async () => {
      try {
        const result = await apiRequest("/withdraw", "POST", {
          amountToman: amount,
          idempotencyKey: crypto.randomUUID(),
        });

        showMessage(
          "withdraw-message",
          result.message || "درخواست برداشت ثبت شد.",
        );

        event.target.reset();
        currentPage = 1;
        await refreshPageData();
      } catch (error) {
        showMessage("withdraw-message", error.message, true);
      }
    });
  });

// Pagination

document.getElementById("prev-btn").addEventListener("click", async () => {
  if (currentPage > 1) {
    currentPage--;
    await loadTransactions();
  }
});

document.getElementById("next-btn").addEventListener("click", async () => {
  if (currentPage < totalPages) {
    currentPage++;
    await loadTransactions();
  }
});

// Refresh

document.getElementById("refresh-btn").addEventListener("click", async () => {
  const button = document.getElementById("refresh-btn");

  await withButtonLock(button, async () => {
    try {
      await refreshPageData();
    } catch (error) {
      alert(error.message);
    }
  });
});

// Logout

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("authToken");
  window.location.replace("/index.html");
});

// Initial load

async function initWalletPage() {
  if (!authToken) return;

  try {
    await refreshPageData();
  } catch (error) {
    if (
      error.message.includes("توکن") ||
      error.message.toLowerCase().includes("unauthorized")
    ) {
      localStorage.removeItem("authToken");
      window.location.replace("/index.html");
      return;
    }

    alert(error.message);
  }
}

initWalletPage();
