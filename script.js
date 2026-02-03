// --- STATE MANAGEMENT ---
let materials = JSON.parse(localStorage.getItem('materials')) || [];
let products = JSON.parse(localStorage.getItem('products')) || [];
let currentRecipe = []; // Temporary holding for the product being built

// --- INITIALIZATION (Run this when page loads) ---
window.onload = function() {
    renderMaterials();       // Draw the inventory table
    updateMaterialSelect();  // FIX: This fills the dropdown menu!
    renderProducts();        // Draw the dashboard
    updateWallet();          // Update the business wallet totals
    
    // Restore saved inputs
    const savedExp = localStorage.getItem('extraExpenses') || 0;
    const expInput = document.getElementById('extraExpenses');
    if(expInput) expInput.value = savedExp;
};

// --- SECTION 1: INVENTORY FUNCTIONS ---

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
        originalPrice: price, // Saved for editing
        originalQty: qty      // Saved for editing
    };

    materials.push(newMat);
    saveData();
    
    // REFRESH EVERYTHING
    renderMaterials();
    updateMaterialSelect(); // <--- This ensures the dropdown updates immediately
    clearInventoryInputs();
}

function clearInventoryInputs() {
    document.getElementById('matName').value = '';
    document.getElementById('matPrice').value = '';
    document.getElementById('matQty').value = '';
}

function renderMaterials() {
    const tbody = document.querySelector('#materialTable tbody');
    if(!tbody) return; // Safety check
    
    tbody.innerHTML = '';
    
    materials.forEach(m => {
        const row = `<tr>
            <td>${m.name}</td>
            <td>₱${m.costPerUnit.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editMaterial(${m.id})">✎</button>
                <button class="action-btn btn-delete" onclick="deleteMaterial(${m.id})">×</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function deleteMaterial(id) {
    if(!confirm("Are you sure you want to delete this material?")) return;
    materials = materials.filter(m => m.id !== id);
    saveData();
    renderMaterials();
    updateMaterialSelect(); // Update dropdown so deleted items disappear
}

function editMaterial(id) {
    const material = materials.find(m => m.id === id);
    if (!material) return;

    // Load values back to inputs
    document.getElementById('matName').value = material.name;
    
    if (material.originalPrice) {
        document.getElementById('matPrice').value = material.originalPrice;
        document.getElementById('matQty').value = material.originalQty;
    } else {
        document.getElementById('matPrice').value = 0;
        document.getElementById('matQty').value = 1;
        alert("Old item detected. Please re-enter Price and Qty.");
    }

    // Remove old item so it doesn't duplicate when we click Add
    deleteMaterial(id); 
    document.getElementById('matName').focus();
}

// --- THIS IS THE MISSING LINK ---
function updateMaterialSelect() {
    const select = document.getElementById('prodMatSelect');
    if(!select) return; // Safety check
    
    select.innerHTML = '<option value="">Select Material...</option>';
    
    materials.forEach(m => {
        // Add each material to the dropdown
        select.innerHTML += `<option value="${m.id}">${m.name} (₱${m.costPerUnit.toFixed(2)})</option>`;
    });
}

// --- SECTION 2: PRODUCT BUILDER ---

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

// LABOR INPUT PREVIEW
// We use simple checks to ensure elements exist before adding listeners
const laborTimeInput = document.getElementById('laborTime');
const laborRateInput = document.getElementById('laborRate');

if(laborTimeInput && laborRateInput) {
    laborTimeInput.addEventListener('input', updateLaborPreview);
    laborRateInput.addEventListener('input', updateLaborPreview);
}

function updateLaborPreview() {
    const mins = parseFloat(document.getElementById('laborTime').value) || 0;
    const rate = parseFloat(document.getElementById('laborRate').value) || 0;
    const laborCost = (mins / 60) * rate;
    const display = document.getElementById('laborCostDisplay');
    if(display) display.innerText = laborCost.toFixed(2);
}

function saveProduct() {
    const name = document.getElementById('prodName').value;
    const sellingPrice = parseFloat(document.getElementById('prodSellingPrice').value);
    const materialCost = parseFloat(document.getElementById('currentCost').innerText);

    // Calculate Labor
    const mins = parseFloat(document.getElementById('laborTime').value) || 0;
    const rate = parseFloat(document.getElementById('laborRate').value) || 0;
    const laborCost = (mins / 60) * rate;

    if (!name || !sellingPrice || (currentRecipe.length === 0 && laborCost === 0)) {
        return alert("Please fill in Name, Price, and at least Materials OR Labor.");
    }

    const totalCost = materialCost + laborCost;
    const profit = sellingPrice - totalCost;
    const margin = (profit / sellingPrice) * 100;

    const newProduct = {
        id: Date.now(),
        name,
        materialCost,
        laborCost,
        totalCost,
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
    document.getElementById('laborTime').value = '';
    
    const laborDisplay = document.getElementById('laborCostDisplay');
    if(laborDisplay) laborDisplay.innerText = '0.00';
    
    currentRecipe = [];
    renderCurrentRecipe();
}

// --- SECTION 3: DASHBOARD & WALLET ---

function renderProducts() {
    const tbody = document.getElementById('auditTable');
    if(!tbody) return;

    tbody.innerHTML = '';

    products.forEach((p, index) => {
        let marginClass = 'margin-low';
        let barColor = '#ef4444'; 
        
        if (p.margin >= 50) { marginClass = 'margin-high'; barColor = '#10b981'; } 
        else if (p.margin >= 30) { marginClass = 'margin-med'; barColor = '#f97316'; }

        // Sanitize values for bar width
        let barWidth = p.margin;
        if(barWidth > 100) barWidth = 100;
        if(barWidth < 0) barWidth = 0;

        // Safely handle old data that might not have laborCost saved
        const labor = p.laborCost || 0;
        const mat = p.materialCost || 0;
        const total = p.totalCost || (mat + labor); // Fallback

        const row = `<tr>
            <td>
                <strong>${p.name}</strong><br>
                <span style="font-size:0.75em; color:#64748b">Mat: ₱${mat.toFixed(0)} | Lab: ₱${labor.toFixed(0)}</span>
            </td>
            <td style="color: #64748b">₱${total.toFixed(2)}</td>
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

    updateWallet();
}

function deleteProduct(index) {
    if(confirm('Delete this audit?')) {
        products.splice(index, 1);
        saveData();
        renderProducts();
    }
}

function updateWallet() {
    // 1. Calculate Totals from Products
    let totalRev = 0;
    let totalCost = 0;

    products.forEach(p => {
        totalRev += p.sellingPrice;
        // Handle fallback for old data
        const tCost = p.totalCost || (p.materialCost + (p.laborCost || 0));
        totalCost += tCost;
    });

    // 2. Get Extra Expenses
    const expInput = document.getElementById('extraExpenses');
    const extraExp = expInput ? (parseFloat(expInput.value) || 0) : 0;

    // 3. Save expenses
    localStorage.setItem('extraExpenses', extraExp);

    // 4. Calculate Net
    const netProfit = totalRev - totalCost - extraExp;

    // 5. Update UI (Check if elements exist first)
    const elRev = document.getElementById('totalRevenue');
    const elCost = document.getElementById('totalProductCost');
    const elNet = document.getElementById('netBusinessProfit');

    if(elRev) elRev.innerText = totalRev.toFixed(2);
    if(elCost) elCost.innerText = totalCost.toFixed(2);
    if(elNet) elNet.innerText = netProfit.toFixed(2);
}

// --- UTILS ---
function saveData() {
    localStorage.setItem('materials', JSON.stringify(materials));
    localStorage.setItem('products', JSON.stringify(products));
}