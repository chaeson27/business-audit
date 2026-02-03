// State Management
let materials = JSON.parse(localStorage.getItem('materials')) || [];
let products = JSON.parse(localStorage.getItem('products')) || [];
let currentRecipe = []; // Temporary holding for the product being built

// --- INITIALIZATION ---
window.onload = function() {
    renderMaterials();
    updateMaterialSelect();
    renderProducts();
};

// --- FUNCTIONS: INVENTORY ---

function addMaterial() {
    const name = document.getElementById('matName').value;
    const price = parseFloat(document.getElementById('matPrice').value);
    const qty = parseFloat(document.getElementById('matQty').value);

    if (!name || !price || !qty) return alert("Please fill all fields");

    const costPerUnit = price / qty;

    const newMat = {
        id: Date.now(),
        name: name,
        costPerUnit: costPerUnit,
        // We now save these so we can "Edit" them later!
        originalPrice: price,
        originalQty: qty
    };

    materials.push(newMat);
    saveData();
    renderMaterials();
    updateMaterialSelect();
    
    // Clear inputs
    clearInventoryInputs();
}

function clearInventoryInputs() {
    document.getElementById('matName').value = '';
    document.getElementById('matPrice').value = '';
    document.getElementById('matQty').value = '';
}

function renderMaterials() {
    const tbody = document.querySelector('#materialTable tbody');
    tbody.innerHTML = '';
    
    materials.forEach(m => {
        // Create the row with Edit and Delete buttons
        const row = `<tr>
            <td>${m.name}</td>
            <td>₱${m.costPerUnit.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editMaterial(${m.id})" title="Edit">✎</button>
                <button class="action-btn btn-delete" onclick="deleteMaterial(${m.id})" title="Delete">×</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function deleteMaterial(id) {
    if(!confirm("Are you sure you want to delete this material?")) return;
    
    // Remove the item with this specific ID
    materials = materials.filter(m => m.id !== id);
    
    saveData();
    renderMaterials();
    updateMaterialSelect();
}

function editMaterial(id) {
    // 1. Find the material
    const material = materials.find(m => m.id === id);
    if (!material) return;

    // 2. Put the values back into the input boxes
    document.getElementById('matName').value = material.name;
    
    // Check if we have old data (from before we updated the code)
    if (material.originalPrice) {
        document.getElementById('matPrice').value = material.originalPrice;
        document.getElementById('matQty').value = material.originalQty;
    } else {
        // If it's an old item, we just show 0 and user has to re-enter
        document.getElementById('matPrice').value = 0;
        document.getElementById('matQty').value = 1;
        alert("This is an old item. Please re-enter Price and Qty.");
    }

    // 3. Remove it from the list (so when you click Add, it doesn't duplicate)
    deleteMaterial(id); 
    
    // 4. Focus the cursor on the name field so you can type immediately
    document.getElementById('matName').focus();
}

// Keep the rest of your code (updateMaterialSelect, Product Builder, etc.) exactly the same.

// --- FUNCTIONS: PRODUCT BUILDER ---
function addMaterialToRecipe() {
    const matId = document.getElementById('prodMatSelect').value;
    const qty = parseFloat(document.getElementById('prodMatQty').value);

    if (!matId || !qty) return alert("Select a material and quantity");

    const material = materials.find(m => m.id == matId);
    
    currentRecipe.push({
        name: material.name,
        costTotal: material.costPerUnit * qty,
        qty: qty
    });

    renderCurrentRecipe();
}

function renderCurrentRecipe() {
    const list = document.getElementById('currentRecipeList');
    const costSpan = document.getElementById('currentCost');
    
    list.innerHTML = '';
    let total = 0;

    currentRecipe.forEach((item) => {
        total += item.costTotal;
        list.innerHTML += `
            <div class="recipe-item">
                <span>${item.qty}x ${item.name}</span>
                <span>₱${item.costTotal.toFixed(2)}</span>
            </div>`;
    });

    costSpan.innerText = total.toFixed(2);
}

// Add an event listener to update the labor cost preview in real-time
document.getElementById('laborTime').addEventListener('input', updateLaborPreview);
document.getElementById('laborRate').addEventListener('input', updateLaborPreview);

function updateLaborPreview() {
    const mins = parseFloat(document.getElementById('laborTime').value) || 0;
    const rate = parseFloat(document.getElementById('laborRate').value) || 0;
    const laborCost = (mins / 60) * rate;
    document.getElementById('laborCostDisplay').innerText = laborCost.toFixed(2);
}

function saveProduct() {
    const name = document.getElementById('prodName').value;
    const sellingPrice = parseFloat(document.getElementById('prodSellingPrice').value);
    const materialCost = parseFloat(document.getElementById('currentCost').innerText); // This comes from materials

    // New Labor Logic
    const mins = parseFloat(document.getElementById('laborTime').value) || 0;
    const rate = parseFloat(document.getElementById('laborRate').value) || 0;
    const laborCost = (mins / 60) * rate;

    // Validation
    if (!name || !sellingPrice || (currentRecipe.length === 0 && laborCost === 0)) {
        return alert("Please fill in Name, Price, and at least Materials OR Labor.");
    }

    const totalCost = materialCost + laborCost;
    const profit = sellingPrice - totalCost;
    const margin = (profit / sellingPrice) * 100;

    const newProduct = {
        id: Date.now(),
        name,
        materialCost, // Raw material cost
        laborCost,    // Labor cost
        totalCost,    // Sum of both
        sellingPrice,
        profit,
        margin
    };

    products.push(newProduct);
    saveData();
    renderProducts();

    // Reset Form
    document.getElementById('prodName').value = '';
    document.getElementById('prodSellingPrice').value = '';
    document.getElementById('prodMatQty').value = '';
    document.getElementById('laborTime').value = ''; // Reset labor
    document.getElementById('laborCostDisplay').innerText = '0.00';
    currentRecipe = [];
    renderCurrentRecipe();
}

function renderProducts() {
    const tbody = document.getElementById('auditTable');
    tbody.innerHTML = '';

    products.forEach((p, index) => {
        let marginClass = 'margin-low';
        let barColor = '#ef4444'; 
        
        if (p.margin >= 50) { marginClass = 'margin-high'; barColor = '#10b981'; } 
        else if (p.margin >= 30) { marginClass = 'margin-med'; barColor = '#f97316'; }

        let barWidth = p.margin > 100 ? 100 : (p.margin < 0 ? 0 : p.margin);

        const row = `<tr>
            <td>
                <strong>${p.name}</strong><br>
                <span style="font-size:0.75em; color:#64748b">Mat: ₱${p.materialCost.toFixed(0)} | Labor: ₱${p.laborCost.toFixed(0)}</span>
            </td>
            <td style="color: #64748b">₱${p.totalCost.toFixed(2)}</td>
            <td>₱${p.sellingPrice.toFixed(2)}</td>
            <td style="font-weight:600">₱${p.profit.toFixed(2)}</td>
            <td>
                <span class="margin-badge ${marginClass}">${p.margin.toFixed(1)}%</span>
                <div class="profit-bar-bg">
                    <div class="profit-bar-fill" style="width: ${barWidth}%; background-color: ${barColor};"></div>
                </div>
            </td>
            <td><button class="delete-btn" onclick="deleteProduct(${index})">Delete</button></td>
        </tr>`;
        tbody.innerHTML += row;
    });

    // Whenever we render the table, we also update the Business Wallet
    updateWallet();
}

function deleteProduct(index) {
    if(confirm('Delete this audit?')) {
        products.splice(index, 1);
        saveData();
        renderProducts();
    }
}

function saveData() {
    localStorage.setItem('materials', JSON.stringify(materials));
    localStorage.setItem('products', JSON.stringify(products));
}

// --- BUSINESS WALLET LOGIC ---

// Load saved expenses if they exist
let savedExpenses = localStorage.getItem('extraExpenses') || 0;
document.getElementById('extraExpenses').value = savedExpenses;

function updateWallet() {
    // 1. Calculate Totals from Products
    let totalRev = 0;
    let totalCost = 0;

    products.forEach(p => {
        totalRev += p.sellingPrice;
        totalCost += p.totalCost;
    });

    // 2. Get Extra Expenses (Shipping/Delivery)
    const extraExp = parseFloat(document.getElementById('extraExpenses').value) || 0;

    // 3. Save expenses so they don't disappear on refresh
    localStorage.setItem('extraExpenses', extraExp);

    // 4. Calculate Final Net Profit
    const netProfit = totalRev - totalCost - extraExp;

    // 5. Update HTML
    document.getElementById('totalRevenue').innerText = totalRev.toFixed(2);
    document.getElementById('totalProductCost').innerText = totalCost.toFixed(2);
    document.getElementById('netBusinessProfit').innerText = netProfit.toFixed(2);
}