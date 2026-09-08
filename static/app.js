
const state = { properties: [], enquiries: [], projects: [], settings: {} };

const $ = id => document.getElementById(id);
const money = n => n >= 10000000 ? "₹"+(n/10000000).toFixed(2)+" Cr" :
  n >= 100000 ? "₹"+(n/100000).toFixed(1)+" Lakh" : "₹"+Number(n||0).toLocaleString("en-IN");

async function api(url, options={}) {
  const r = await fetch(url, {headers: {"Content-Type":"application/json", ...(options.headers||{})}, ...options});
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadPublic() {
  try {
    [state.properties,state.projects,state.settings] = await Promise.all([
      api("/api/properties"), api("/api/projects"), api("/api/settings")
    ]);
    renderProperties(state.properties.filter(p=>p.featured));
    applySettings();
  } catch(e) { console.error(e); }
}

function applySettings(){
  document.querySelectorAll(".footer p").forEach(p=>{
    const t=p.textContent;
    if(t.includes("98765")) p.textContent="📞 "+(state.settings.phone||"+91 9042814248");
    if(t.includes("hello@")) p.textContent="✉️ "+(state.settings.email||"hello@agpromoters.com");
    if(t.includes("Tamil Nadu")) p.textContent="📍 "+(state.settings.address||"Tamil Nadu, India");
  });
}

function card(p){
  return `<article class="property-card"><div class="property-img"><img src="${escapeHtml(p.image||'/static/assets/logo.png')}" alt="${escapeHtml(p.title)}" loading="lazy"><span class="badge">${escapeHtml(p.type)}</span><span class="status">${escapeHtml(p.status)}</span></div>
  <div class="card-body"><h3>${escapeHtml(p.title)}</h3><div class="price">${money(p.price)}</div><div class="location">📍 ${escapeHtml(p.location)}</div>
  <div class="meta"><span>📐 ${escapeHtml(p.area||"-")}</span>${p.beds?`<span>🛏 ${p.beds} Beds</span>`:""}${p.baths?`<span>🛁 ${p.baths} Baths</span>`:""}<span>🏷 ${escapeHtml(p.purpose)}</span></div>
  <div class="card-actions"><button class="btn btn-dark" onclick="viewProperty(${p.id})">View Details</button><button class="btn btn-light" onclick="enquireFor(${p.id})">Enquire</button></div></div></article>`;
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function renderProperties(list){ $("propertyCards").innerHTML=list.length?list.map(card).join(""):"<p style='grid-column:1/-1;text-align:center'>No properties found.</p>"; }
function viewProperty(id){
  const p=state.properties.find(x=>x.id===id); if(!p)return;
  $("propertyDetail").innerHTML=`<div class="detail-grid"><div class="detail-image"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}"></div><div class="detail-content">
  <div class="eyebrow">${escapeHtml(p.type)} • ${escapeHtml(p.status)}</div><h2>${escapeHtml(p.title)}</h2><div class="price">${money(p.price)}</div><div class="location">📍 ${escapeHtml(p.location)}</div>
  <p>${escapeHtml(p.description)}</p><div class="amenities">${(p.amenities||[]).map(a=>`<span>✓ ${escapeHtml(a)}</span>`).join("")}</div>
  <div class="meta" style="border:0">${p.area?`<span>📐 ${escapeHtml(p.area)}</span>`:""}${p.beds?`<span>🛏 ${p.beds} Beds</span>`:""}${p.baths?`<span>🛁 ${p.baths} Baths</span>`:""}${p.parking?`<span>🚗 ${escapeHtml(p.parking)}</span>`:""}</div><br>
  <button class="btn btn-gold" onclick="enquireFor(${p.id})">Send Enquiry</button> <button class="btn btn-dark" onclick="callCompany()">📞 Call Now</button></div></div>`;
  $("propertyModal").classList.add("open");
}
function enquireFor(id){const p=state.properties.find(x=>x.id===id);closeModal("propertyModal");openEnquiry();$("enqProperty").value=p?.title||"";}
function openEnquiry(){$("enquiryModal").classList.add("open");}
function closeModal(id){$(id).classList.remove("open");}
function priceMatch(n,v){if(!v)return true;if(v==="under20")return n<2000000;if(v==="20to50")return n>=2000000&&n<=5000000;if(v==="50to100")return n>5000000&&n<=10000000;if(v==="above100")return n>10000000;return true;}
function searchProperties(){const l=$("searchLocation").value,t=$("searchType").value,p=$("searchPurpose").value,pr=$("searchPrice").value;renderProperties(state.properties.filter(x=>(!l||x.location===l)&&(!t||x.type===t)&&(!p||x.purpose===p)&&priceMatch(x.price,pr)));$("properties").scrollIntoView({behavior:"smooth"});}
function filterType(t){$("searchType").value=t;renderProperties(state.properties.filter(p=>p.type===t));$("properties").scrollIntoView({behavior:"smooth"});}
function showAllProperties(){renderProperties(state.properties);$("properties").scrollIntoView({behavior:"smooth"});}
async function submitEnquiry(e){e.preventDefault();try{await api("/api/enquiries",{method:"POST",body:JSON.stringify({name:$("enqName").value,phone:$("enqPhone").value,email:$("enqEmail").value,property:$("enqProperty").value,message:$("enqMessage").value})});$("enqResult").innerHTML='<div class="notice" style="margin-top:12px">✓ Enquiry submitted successfully. AG Promoters will contact you.</div>';e.target.reset();}catch(err){$("enqResult").innerHTML='<div class="error">'+escapeHtml(err.message)+'</div>';}}
function callCompany(){window.location.href="tel:"+(state.settings.phone||"+919876543210").replace(/\s/g,"");}
function whatsapp(){window.open("https://wa.me/919876543210?text=Hello%20AG%20Promoters,%20I%20am%20interested%20in%20your%20properties.","_blank");}
function toggleMobile(){alert("Use the navigation links or scroll through the page on mobile.");}

function openAdmin(){$("publicSite").classList.add("hidden");$("admin").classList.remove("hidden");renderAdminLogin();}
function logout(){api("/api/logout",{method:"POST"}).catch(()=>{});$("admin").classList.add("hidden");$("publicSite").classList.remove("hidden");loadPublic();}
function renderAdminLogin(){$("admin").innerHTML=`<div class="login-page"><div class="login-box"><a class="logo"><img class="logo-img" src="/static/assets/logo.png" alt="AG Promoters"></a><h1>Admin Login</h1><p style="text-align:center;color:#6b7280">Owner / Admin Panel</p><form class="form" onsubmit="adminLogin(event)"><input id="adminUser" required placeholder="Email / Username"><input id="adminPass" type="password" required placeholder="Password"><button class="btn btn-gold">Secure Login</button><div id="loginError" class="error"></div></form><p style="font-size:12px;color:#888;text-align:center;margin-top:18px">Default local login: <b>admin</b> / <b>admin123</b></p><button class="btn btn-light" style="width:100%;margin-top:8px" onclick="logout()">Back to Website</button></div></div>`;}
async function adminLogin(e){e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({username:$("adminUser").value,password:$("adminPass").value})});await refreshAdmin();renderDashboard();}catch(err){$("loginError").textContent=err.message;}}

function adminShell(content,title){$("admin").innerHTML=`<div class="admin-layout"><aside class="sidebar"><a class="logo"><img class="logo-img" src="/static/assets/logo.png" alt="AG Promoters"></a><div class="side-link active" onclick="renderDashboard()">📊 Dashboard</div><div class="side-link" onclick="renderManage()">🏘️ Properties</div><div class="side-link" onclick="renderAdd()">➕ Add Property</div><div class="side-link" onclick="renderEnquiries()">📩 Enquiries</div><div class="side-link" onclick="renderProjectsAdmin()">🏗️ Projects</div><div class="side-link" onclick="renderSettings()">⚙️ Settings</div><div class="side-link" onclick="logout()">🌐 View Website</div></aside><main class="admin-main"><div class="admin-nav-mobile"><span class="side-link" onclick="renderDashboard()">Dashboard</span><span class="side-link" onclick="renderManage()">Properties</span><span class="side-link" onclick="renderAdd()">Add</span><span class="side-link" onclick="renderEnquiries()">Enquiries</span><span class="side-link" onclick="logout()">Website</span></div><div class="admin-top"><div><h1>${title}</h1><small>AG Promoters Management System</small></div><button class="btn btn-light" onclick="logout()">Logout</button></div>${content}</main></div>`;}

async function refreshAdmin(){state.properties=await api("/api/properties");state.enquiries=await api("/api/enquiries");state.projects=await api("/api/projects");state.settings=await api("/api/settings");}
function propertyTable(list,actions=true){return `<div class="table-wrap"><table class="table"><thead><tr><th>Property</th><th>Type</th><th>Location</th><th>Price</th><th>Status</th>${actions?"<th>Actions</th>":""}</tr></thead><tbody>${list.map(p=>`<tr><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.type)}</td><td>${escapeHtml(p.location)}</td><td>${money(p.price)}</td><td>${escapeHtml(p.status)}</td>${actions?`<td><button class="btn btn-light" onclick="editProperty(${p.id})">Edit</button> <button class="btn btn-light" onclick="deleteProperty(${p.id})">Delete</button></td>`:""}</tr>`).join("")}</tbody></table></div>`;}
function enquiryTable(list){return `<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Phone</th><th>Property</th><th>Date</th><th>Status</th></tr></thead><tbody>${list.map(e=>`<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.phone)}</td><td>${escapeHtml(e.property||"-")}</td><td>${escapeHtml(e.created_at)}</td><td><select onchange="updateEnquiry(${e.id},this.value)"><option ${e.status==="Pending"?"selected":""}>Pending</option><option ${e.status==="Contacted"?"selected":""}>Contacted</option><option ${e.status==="Closed"?"selected":""}>Closed</option></select></td></tr>`).join("")}</tbody></table></div>`;}
function renderDashboard(){adminShell(`<div class="stat-grid"><div class="stat"><small>Total Properties</small><strong>${state.properties.length}</strong></div><div class="stat"><small>Available</small><strong>${state.properties.filter(p=>p.status==="Available").length}</strong></div><div class="stat"><small>Sold</small><strong>${state.properties.filter(p=>p.status==="Sold").length}</strong></div><div class="stat"><small>Reserved</small><strong>${state.properties.filter(p=>p.status==="Reserved").length}</strong></div><div class="stat"><small>Enquiries</small><strong>${state.enquiries.length}</strong></div></div><div class="panel"><h2>Recent Properties</h2>${propertyTable(state.properties.slice(0,5),false)}</div><div class="panel"><h2>Recent Enquiries</h2>${state.enquiries.length?enquiryTable(state.enquiries.slice(0,5)):"<p>No enquiries yet.</p>"}</div>`,"Dashboard");}
function renderManage(){adminShell(`<div class="panel"><div style="display:flex;gap:10px;flex-wrap:wrap"><input id="adminSearch" oninput="adminFilter()" placeholder="Search properties..." style="padding:11px;border:1px solid #ddd;border-radius:8px;flex:1"><select id="adminType" onchange="adminFilter()" style="padding:11px;border:1px solid #ddd;border-radius:8px"><option value="">All Types</option>${["Plot","House","Villa","Apartment","Farm Land","Commercial"].map(x=>`<option>${x}</option>`).join("")}</select><button class="btn btn-gold" onclick="renderAdd()">+ Add Property</button></div><div id="adminPropertyTable" style="margin-top:20px">${propertyTable(state.properties)}</div></div>`,"Manage Properties");}
function adminFilter(){const q=($("adminSearch").value||"").toLowerCase(),t=$("adminType").value;const list=state.properties.filter(p=>(!q||JSON.stringify(p).toLowerCase().includes(q))&&(!t||p.type===t));$("adminPropertyTable").innerHTML=propertyTable(list);}
function renderAdd(id=null){const p=id?state.properties.find(x=>x.id===id):{};adminShell(`<div class="panel"><form class="admin-form" onsubmit="saveProperty(event,${id||"null"})"><input id="fTitle" required placeholder="Property Title" value="${escapeHtml(p.title||"")}"><select id="fType" required><option value="">Property Type</option>${["Plot","House","Villa","Apartment","Farm Land","Commercial"].map(x=>`<option ${p.type===x?"selected":""}>${x}</option>`).join("")}</select><select id="fPurpose"><option ${p.purpose==="Sale"?"selected":""}>Sale</option><option ${p.purpose==="Rent"?"selected":""}>Rent</option></select><input id="fPrice" type="number" required placeholder="Price (₹)" value="${p.price||""}"><input id="fLocation" required placeholder="Location" value="${escapeHtml(p.location||"")}"><input id="fArea" placeholder="Land / Built-up Area" value="${escapeHtml(p.area||"")}"><input id="fBeds" type="number" placeholder="Bedrooms" value="${p.beds||0}"><input id="fBaths" type="number" placeholder="Bathrooms" value="${p.baths||0}"><input id="fParking" placeholder="Parking" value="${escapeHtml(p.parking||"")}"><select id="fStatus">${["Available","Reserved","Sold","Rented"].map(x=>`<option ${p.status===x?"selected":""}>${x}</option>`).join("")}</select><input id="fImage" class="full" placeholder="Main Image URL" value="${escapeHtml(p.image||"")}"><textarea id="fDescription" class="full" placeholder="Description">${escapeHtml(p.description||"")}</textarea><input id="fAmenities" class="full" placeholder="Amenities separated by comma" value="${escapeHtml((p.amenities||[]).join(", "))}"><label><input id="fFeatured" type="checkbox" ${p.featured?"checked":""}> Featured Property</label><div class="full admin-actions"><button type="button" class="btn btn-light" onclick="renderManage()">Cancel</button><button class="btn btn-gold">${id?"Update":"Publish"} Property</button></div></form></div>`,id?"Edit Property":"Add Property");}
async function saveProperty(e,id){e.preventDefault();const data={title:$("fTitle").value,type:$("fType").value,purpose:$("fPurpose").value,price:Number($("fPrice").value),location:$("fLocation").value,area:$("fArea").value,beds:Number($("fBeds").value||0),baths:Number($("fBaths").value||0),parking:$("fParking").value,status:$("fStatus").value,image:$("fImage").value||"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",description:$("fDescription").value,amenities:$("fAmenities").value.split(",").map(x=>x.trim()).filter(Boolean),featured:$("fFeatured").checked};try{await api(id?`/api/properties/${id}`:"/api/properties",{method:id?"PUT":"POST",body:JSON.stringify(data)});await refreshAdmin();renderManage();}catch(err){alert(err.message);}}
function editProperty(id){renderAdd(id);}
async function deleteProperty(id){if(!confirm("Delete this property?"))return;try{await api(`/api/properties/${id}`,{method:"DELETE"});await refreshAdmin();renderManage();}catch(e){alert(e.message);}}
function renderEnquiries(){adminShell(`<div class="panel"><h2>Customer Enquiries</h2>${state.enquiries.length?enquiryTable(state.enquiries):"<p>No enquiries received.</p>"}`,"Enquiries");}
async function updateEnquiry(id,status){try{await api(`/api/enquiries/${id}`,{method:"PATCH",body:JSON.stringify({status})});await refreshAdmin();renderEnquiries();}catch(e){alert(e.message);}}
function renderProjectsAdmin(){adminShell(`<div class="panel"><h2>Project Management</h2><p>Projects are currently managed from the database seed. Add a dedicated project CRUD screen when project data is supplied by the client.</p><div class="cards">${state.projects.map(p=>`<div class="feature"><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.status)} • ${escapeHtml(p.subtitle)}</p></div>`).join("")}</div></div>`,"Project Management");}
function renderSettings(){adminShell(`<div class="panel"><h2>Website Settings</h2><form class="admin-form" onsubmit="saveSettings(event)"><input id="sCompany" value="${escapeHtml(state.settings.company||"AG Promoters")}" placeholder="Company Name"><input id="sPhone" value="${escapeHtml(state.settings.phone||"")}" placeholder="Phone"><input id="sEmail" value="${escapeHtml(state.settings.email||"")}" placeholder="Email"><input id="sAddress" value="${escapeHtml(state.settings.address||"")}" placeholder="Office Address"><div class="full admin-actions"><button class="btn btn-gold">Save Settings</button></div></form><div id="settingsMsg"></div></div>`,"Settings");}
async function saveSettings(e){e.preventDefault();try{state.settings=await api("/api/settings",{method:"PUT",body:JSON.stringify({company:$("sCompany").value,phone:$("sPhone").value,email:$("sEmail").value,address:$("sAddress").value})});$("settingsMsg").innerHTML='<div class="notice" style="margin-top:15px">✓ Settings saved to database.</div>';}catch(err){alert(err.message);}}

document.addEventListener("DOMContentLoaded",()=>{
  const video=document.querySelector(".hero-video");
  if(video){video.muted=true;video.setAttribute("muted","");video.setAttribute("playsinline","");video.play().catch(()=>{});document.addEventListener("click",()=>video.play().catch(()=>{}),{once:true});}
  loadPublic();
});
