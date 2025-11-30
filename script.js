const Store = {
    data: {
        installations: [
            { id: 'def', name: 'Hytele Beta', version: '1.0', icon: 'grass' }
        ],
        selectedId: 'def'
    },
    init() {
        const s = localStorage.getItem('hytele_data');
        if(s) this.data = JSON.parse(s);
        InstallManager.render();
    },
    save() {
        localStorage.setItem('hytele_data', JSON.stringify(this.data));
        InstallManager.render();
    },
    reset() {
        localStorage.removeItem('hytele_data');
        location.reload();
    }
};

const Launcher = {
    isDownloading: false,

    nav(viewId) {
        document.querySelectorAll('.view-panel').forEach(e => e.classList.remove('active-view'));
        document.getElementById(viewId).classList.add('active-view');
        if(viewId === 'view-play') this.switchTab(document.querySelector('.tab-btn'), 'view-play');
    },

    switchTab(btn, targetId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        document.querySelectorAll('.view-panel').forEach(e => e.classList.remove('active-view'));
        document.getElementById(targetId).classList.add('active-view');
    },

    openModal(id) { document.getElementById(id).style.display = 'flex'; },
    closeModal(id) { document.getElementById(id).style.display = 'none'; },

    play() {
        if(this.isDownloading) return;
        this.startDownloadSim();
    },

    startDownloadSim() {
        this.isDownloading = true;
        const btn = document.getElementById('btn-play');
        const bar = document.getElementById('progress-fill');
        const txt = document.getElementById('status-percent');
        const msg = document.getElementById('status-msg');
        document.getElementById('progress-area').style.display = 'flex';
        btn.disabled = true; btn.innerText = "CANCELAR";
        
        let p = 0;
        const i = setInterval(() => {
            p += Math.random() * 5;
            if(p > 100) p = 100;
            bar.style.width = p + "%";
            txt.innerText = Math.floor(p) + "%";
            
            if(p < 30) msg.innerText = "Baixando Hytele.jar...";
            else if(p < 80) msg.innerText = "Verificando assets...";
            else msg.innerText = "Iniciando mundo...";

            if(p >= 100) {
                clearInterval(i);
                this.launchGame();
            }
        }, 50);
    },

    launchGame() {
        this.isDownloading = false;
        document.getElementById('btn-play').innerText = "JOGAR";
        document.getElementById('btn-play').disabled = false;
        document.getElementById('progress-area').style.display = 'none';
        document.getElementById('launcher-root').style.display = 'none';
        document.getElementById('game-root').style.display = 'block';
        MCGame.start();
    }
};

const InstallManager = {
    create() {
        const name = document.getElementById('inst-name').value || "Nova Instalação";
        const ver = document.getElementById('inst-ver').value;
        Store.data.installations.push({ id: 'i'+Date.now(), name, version: ver, icon: 'furnace' });
        Store.save();
        Launcher.closeModal('modal-install');
        Launcher.nav('view-installations');
    },
    select(id) { Store.data.selectedId = id; Store.save(); Launcher.nav('view-play'); },
    delete(id) {
        if(confirm("Deletar esta instalação?")) {
            Store.data.installations = Store.data.installations.filter(i => i.id !== id);
            if(Store.data.selectedId === id) Store.data.selectedId = Store.data.installations[0]?.id || null;
            Store.save();
        }
    },
    render() {
        const list = document.getElementById('install-list');
        list.innerHTML = Store.data.installations.map(i => `
            <div class="install-item">
                <div class="install-icon">📦</div>
                <div style="flex:1">
                    <div style="font-weight:bold; color:white">${i.name}</div>
                    <div style="font-size:12px; color:#aaa">${i.version}</div>
                </div>
                <button class="btn-primary" onclick="InstallManager.select('${i.id}')">Jogar</button>
                ${i.id!=='def'?`<button class="btn-small" style="background:#d32f2f; margin-left:10px" onclick="InstallManager.delete('${i.id}')">X</button>`:''}
            </div>
        `).join('');
        const sel = Store.data.installations.find(i => i.id === Store.data.selectedId);
        if(sel) document.getElementById('display-version').innerText = `${sel.name} (${sel.version})`;
    },
    loadNews() {
        const n = [{t: "Bem-vindo ao Hytele", img: "⚔️"}, {t: "Update de Aventura", img: "🌲"}, {t: "Cosméticos Novos", img: "💎"}];
        document.getElementById('news-feed').innerHTML = n.map(x => `
            <div class="news-card">
                <div class="news-img">${x.img}</div>
                <div class="news-content">
                    <span class="news-tag">Novidade</span>
                    <div class="news-title">${x.t}</div>
                    <div style="color:#aaa; font-size:12px">Clique para ler mais sobre as novidades do Hytele.</div>
                </div>
            </div>
        `).join('');
    }
};

const MCGame = {
    isRunning: false,
    gl: null, canvas: null, prog: null, world: null, player: null, keys: {}, lastTime: 0, isMobile: false,

    start() {
        if(!this.gl) this.init();
        this.isRunning = true;
        this.resize();
        this.loop(0);
        if(!this.isMobile) { this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock; this.canvas.requestPointerLock(); }
    },

    stop() {
        this.isRunning = false;
        if(document.exitPointerLock) document.exitPointerLock();
        document.getElementById('game-root').style.display = 'none';
        document.getElementById('launcher-root').style.display = 'flex';
    },

    init() {
        this.canvas = document.getElementById('gl');
        this.gl = this.canvas.getContext('webgl', { alpha: false, antialias: false, depth: true });
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vs, document.getElementById('vs').text); this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fs, document.getElementById('fs').text); this.gl.compileShader(fs);
        this.prog = this.gl.createProgram();
        this.gl.attachShader(this.prog, vs); this.gl.attachShader(this.prog, fs); this.gl.linkProgram(this.prog); this.gl.useProgram(this.prog);

        const tex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.genTexture());
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

        this.locs = {
            pos: this.gl.getAttribLocation(this.prog, 'position'),
            uv: this.gl.getAttribLocation(this.prog, 'uv'),
            light: this.gl.getAttribLocation(this.prog, 'light'),
            P: this.gl.getUniformLocation(this.prog, 'uPMatrix'),
            V: this.gl.getUniformLocation(this.prog, 'uVMatrix'),
            M: this.gl.getUniformLocation(this.prog, 'uMMatrix'),
            FogC: this.gl.getUniformLocation(this.prog, 'uFogColor')
        };
        this.gl.enableVertexAttribArray(this.locs.pos); this.gl.enableVertexAttribArray(this.locs.uv); this.gl.enableVertexAttribArray(this.locs.light);
        this.gl.enable(this.gl.DEPTH_TEST); this.gl.enable(this.gl.CULL_FACE);
        this.gl.clearColor(0.6, 0.8, 1.0, 1.0); this.gl.uniform3f(this.locs.FogC, 0.6, 0.8, 1.0);

        this.world = new World(); this.world.init();
        this.player = { x: 0, y: 30, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false, inventory: new Array(9).fill(null).map(()=>({id:0, count:0})), sel: 0 };
        this.player.inventory[0] = {id:3, count:64}; this.player.inventory[1] = {id:6, count:16};
        this.updateInvUI();
        this.setupInputs();
    },

    genTexture() {
        const c = document.createElement('canvas'); c.width=128; c.height=128; const ctx = c.getContext('2d');
        const noise = (r,g,b,v) => { const n=(Math.random()-0.5)*v; return `rgb(${r+n},${g+n},${b+n})`; };
        const draw = (id, fn) => { const tx=(id%8)*16, ty=Math.floor(id/8)*16; for(let y=0;y<16;y++) for(let x=0;x<16;x++) { ctx.fillStyle=fn(x,y); ctx.fillRect(tx+x,ty+y,1,1); } };
        draw(1, ()=>noise(80,180,60,40)); draw(2, ()=>noise(100,70,40,30)); draw(3, (x,y)=>y<4?noise(80,180,60,40):noise(100,70,40,30)); draw(4, ()=>noise(120,120,120,30)); draw(5, ()=>Math.random()<0.2?'#000':'#444'); draw(6, ()=>noise(90,60,30,10)); draw(7, ()=>noise(80,50,20,10)); draw(8, ()=>Math.random()>0.6?'rgba(0,0,0,0)':noise(30,140,30,40)); draw(11, (x,y)=>(x%4===0||y%16===0)?'#4a3016':'#8f6842');
        return c;
    },

    setupInputs() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('keydown', e => { if(this.isRunning) this.keys[e.code] = true; });
        window.addEventListener('keyup', e => { if(this.isRunning) this.keys[e.code] = false; });
        document.addEventListener('mousemove', e => {
            if (this.isRunning && document.pointerLockElement === this.canvas) {
                this.player.yaw -= e.movementX * 0.003; this.player.pitch -= e.movementY * 0.003;
                this.player.pitch = Math.max(-1.55, Math.min(1.55, this.player.pitch));
            }
        });
        this.canvas.addEventListener('mousedown', e => {
            if(!this.isRunning) return;
            if(document.pointerLockElement !== this.canvas && !this.isMobile) { this.canvas.requestPointerLock(); return; }
            this.handleAction(e.button === 2 ? 'place' : 'break');
        });
        this.canvas.addEventListener('touchstart', () => { this.isMobile=true; }, {once:true});
        const jumpBtn = document.getElementById('btn-jump');
        jumpBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); this.keys['Space']=true; });
        jumpBtn.addEventListener('touchend', (e)=>{ e.preventDefault(); this.keys['Space']=false; });
        const touchZone = document.getElementById('stick-move');
        window.addEventListener('touchstart', e => {
            if(!this.isRunning) return;
            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if(t.clientX < window.innerWidth/2) {
                    this.moveTouchId = t.identifier; this.moveOrigin = {x:t.clientX, y:t.clientY};
                    touchZone.style.display='block'; touchZone.style.left = t.clientX+'px'; touchZone.style.top = t.clientY+'px';
                }
            }
        });
        window.addEventListener('touchmove', e => {
            if(!this.isRunning) return;
            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if(t.identifier === this.moveTouchId) {
                    const dx = t.clientX - this.moveOrigin.x; const dy = t.clientY - this.moveOrigin.y;
                    this.keys['KeyW'] = dy < -20; this.keys['KeyS'] = dy > 20; this.keys['KeyA'] = dx < -20; this.keys['KeyD'] = dx > 20;
                } else if (t.clientX > window.innerWidth/2) {
                     this.player.yaw -= (t.clientX - (this.lastTouchX||t.clientX)) * 0.01;
                     this.player.pitch -= (t.clientY - (this.lastTouchY||t.clientY)) * 0.01;
                     this.player.pitch = Math.max(-1.55, Math.min(1.55, this.player.pitch));
                     this.lastTouchX = t.clientX; this.lastTouchY = t.clientY;
                }
            }
        });
        window.addEventListener('touchend', e => {
            for(let i=0; i<e.changedTouches.length; i++) {
                if(e.changedTouches[i].identifier === this.moveTouchId) {
                    this.moveTouchId = null; this.keys['KeyW']=false; this.keys['KeyS']=false; this.keys['KeyA']=false; this.keys['KeyD']=false; touchZone.style.display='none';
                }
            }
            this.lastTouchX = null;
        });
    },

    resize() { if(this.canvas){ this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); } },

    loop(time) {
        if(!this.isRunning) return;
        const dt = Math.min((time - this.lastTime) / 1000, 0.1); this.lastTime = time;
        this.updatePhysics(dt); this.render();
        requestAnimationFrame(t => this.loop(t));
    },

    updatePhysics(dt) {
        let dx = 0, dz = 0;
        if (this.keys['KeyW']) { dx -= Math.sin(this.player.yaw); dz -= Math.cos(this.player.yaw); }
        if (this.keys['KeyS']) { dx += Math.sin(this.player.yaw); dz += Math.cos(this.player.yaw); }
        if (this.keys['KeyA']) { dx -= Math.cos(this.player.yaw); dz += Math.sin(this.player.yaw); }
        if (this.keys['KeyD']) { dx += Math.cos(this.player.yaw); dz -= Math.sin(this.player.yaw); }
        
        const l = Math.sqrt(dx*dx + dz*dz); if(l > 0) { dx/=l; dz/=l; }
        const speed = 5.0; this.player.vx = dx * speed; this.player.vz = dz * speed; this.player.vy += -24.0 * dt;

        if (this.keys['Space'] && this.player.onGround) { this.player.vy = 9.0; this.player.onGround = false; }

        let nextX = this.player.x + this.player.vx * dt;
        let nextY = this.player.y + this.player.vy * dt;
        let nextZ = this.player.z + this.player.vz * dt;

        // PHYSICS FIX: Solid Ground Check
        const groundHeight = this.world.getHeight(Math.floor(nextX), Math.floor(nextZ));
        const floorY = groundHeight + 1.8; // Player Height

        // Hard collision with floor to prevent falling through
        if (nextY < floorY) {
            this.player.y = floorY;
            this.player.vy = 0;
            this.player.onGround = true;
        } else {
            this.player.y = nextY;
            this.player.onGround = false;
        }

        this.player.x = nextX;
        this.player.z = nextZ;

        document.getElementById('coords').innerText = `X:${Math.floor(this.player.x)} Y:${Math.floor(this.player.y)} Z:${Math.floor(this.player.z)}`;
        document.getElementById('fps').innerText = Math.round(1/dt);
    },

    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        const pMat = new Float32Array(16); const vMat = new Float32Array(16); const aspect = this.canvas.width / this.canvas.height;
        const f = 1.0 / Math.tan(Math.PI/4 / 2), nf = 1 / (0.1 - 100);
        pMat[0] = f / aspect; pMat[5] = f; pMat[10] = (100 + 0.1) * nf; pMat[11] = -1; pMat[14] = (2 * 100 * 0.1) * nf;
        const eye = [this.player.x, this.player.y + 1.6, this.player.z];
        const target = [this.player.x - Math.sin(this.player.yaw) * Math.cos(this.player.pitch), this.player.y + 1.6 + Math.sin(this.player.pitch), this.player.z - Math.cos(this.player.yaw) * Math.cos(this.player.pitch)];
        const up = [0,1,0];
        const z0=eye[0]-target[0], z1=eye[1]-target[1], z2=eye[2]-target[2]; const len = 1/Math.sqrt(z0*z0+z1*z1+z2*z2); const za = [z0*len, z1*len, z2*len];
        const x0=up[1]*za[2]-up[2]*za[1], x1=up[2]*za[0]-up[0]*za[2], x2=up[0]*za[1]-up[1]*za[0]; const lenX = 1/Math.sqrt(x0*x0+x1*x1+x2*x2); const xa = [x0*lenX, x1*lenX, x2*lenX];
        const ya = [za[1]*xa[2]-za[2]*xa[1], za[2]*xa[0]-za[0]*xa[2], za[0]*xa[1]-za[1]*xa[0]];
        vMat[0]=xa[0]; vMat[1]=ya[0]; vMat[2]=za[0]; vMat[3]=0; vMat[4]=xa[1]; vMat[5]=ya[1]; vMat[6]=za[1]; vMat[7]=0; vMat[8]=xa[2]; vMat[9]=ya[2]; vMat[10]=za[2]; vMat[11]=0;
        vMat[12]=-(xa[0]*eye[0]+xa[1]*eye[1]+xa[2]*eye[2]); vMat[13]=-(ya[0]*eye[0]+ya[1]*eye[1]+ya[2]*eye[2]); vMat[14]=-(za[0]*eye[0]+za[1]*eye[1]+za[2]*eye[2]); vMat[15]=1;
        this.gl.uniformMatrix4fv(this.locs.P, false, pMat); this.gl.uniformMatrix4fv(this.locs.V, false, vMat);
        const cx=Math.floor(this.player.x/16), cz=Math.floor(this.player.z/16);
        for(let x=cx-2; x<=cx+2; x++) for(let z=cz-2; z<=cz+2; z++) { this.world.renderChunk(x,0,z, this.gl, this.locs); }
    },

    raycast() {
        let x=this.player.x, y=this.player.y+1.6, z=this.player.z;
        let dx = -Math.sin(this.player.yaw)*Math.cos(this.player.pitch); let dy = Math.sin(this.player.pitch); let dz = -Math.cos(this.player.yaw)*Math.cos(this.player.pitch);
        let px=Math.floor(x), py=Math.floor(y), pz=Math.floor(z);
        for(let i=0; i<6; i+=0.1) {
            x+=dx*0.1; y+=dy*0.1; z+=dz*0.1;
            let ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
            let b = this.world.getBlock(ix,iy,iz);
            if(b!==0 && b!==undefined) return {hit:true, bx:ix, by:iy, bz:iz, px:px, py:py, pz:pz};
            px=ix; py=iy; pz=iz;
        }
        return {hit:false};
    },

    handleAction(type) {
        const hit = this.raycast();
        if(hit.hit) {
            if(type === 'break') { this.world.setBlock(hit.bx, hit.by, hit.bz, 0); } 
            else {
                const item = this.player.inventory[this.player.sel];
                if(item.id !== 0 && item.count > 0) {
                     const dx = Math.abs((hit.px+0.5)-this.player.x); const dy = Math.abs((hit.py+0.5)-(this.player.y+0.9)); const dz = Math.abs((hit.pz+0.5)-this.player.z);
                     if(dx>0.8 || dy>0.8 || dz>0.8) { this.world.setBlock(hit.px, hit.py, hit.pz, item.id); }
                }
            }
        }
    },

    updateInvUI() {
        const bar = document.getElementById('hotbar'); bar.innerHTML = '';
        this.player.inventory.forEach((it, i) => {
            const d = document.createElement('div'); d.className = 'slot' + (i===this.player.sel ? ' active' : '');
            if(it.id !== 0) { let c='#fff'; if(it.id===3)c='#888'; if(it.id===6)c='#531'; d.innerHTML = `<div style="width:20px;height:20px;background:${c}"></div><span>${it.count}</span>`; }
            d.onclick = () => { this.player.sel=i; this.updateInvUI(); }; bar.appendChild(d);
        });
    }
};

class World {
    constructor() { this.chunks={}; }
    init() {}
    key(cx,cy,cz) { return cx+','+cy+','+cz; }
    getChunk(cx,cy,cz) { const k = this.key(cx,cy,cz); if(!this.chunks[k]) this.gen(cx,cy,cz); return this.chunks[k]; }

    gen(cx,cy,cz) {
        const data = new Uint8Array(4096);
        for(let x=0;x<16;x++) for(let z=0;z<16;z++) {
            const wx=cx*16+x, wz=cz*16+z;
            const h = Math.floor(Math.sin(wx*0.1)*4 + Math.cos(wz*0.1)*4 + 10);
            for(let y=0;y<16;y++) {
                const wy=cy*16+y;
                let id=0;
                // FILL TERRAIN: No Holes. If y <= height, it is solid.
                if(wy <= h) {
                    if(wy===0) id=5; // Bedrock
                    else if(wy<h-3) id=4; // Stone
                    else if(wy<h) id=2; // Dirt
                    else id=1; // Grass
                }
                data[x+y*16+z*256] = id;
            }
            // Trees
            if(x===8 && z===8) {
                const groundY = h; const localY = groundY - (cy*16);
                if(localY >= 0 && localY < 12) {
                    for(let i=1; i<=5; i++) { if(localY+i < 16) data[x+(localY+i)*16+z*256] = 6; }
                    for(let ly=3; ly<=4; ly++) {
                        for(let lx=-2; lx<=2; lx++) for(let lz=-2; lz<=2; lz++) {
                            if(lx===0 && lz===0) continue; 
                            const fX = x+lx; const fZ = z+lz; const fY = localY+ly;
                            if(fX>=0 && fX<16 && fZ>=0 && fZ<16 && fY<16) { if(data[fX+fY*16+fZ*256] === 0) data[fX+fY*16+fZ*25