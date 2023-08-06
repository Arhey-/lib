export class DB {
	/** @type {IDBDatabase} */
	db;
	#opening = {};
	#ready = new Promise((resolve, reject) => Object.assign(this.#opening, { resolve, reject }));

	get ready() { return this.#ready }

	constructor(name, v = 1, upgrade, log = console.log.bind(console)) {
		const openReq = indexedDB.open(name, v);
		openReq.onerror = e => this.#opening.reject(e);
		openReq.onblocked = () => log("Please close all other tabs with this site!");
		openReq.onupgradeneeded = (/** @type {IDBVersionChangeEvent} */ e) => {
			log('onupgradeneeded', e) // { dataLoss: 'none', dataLossMessage: '', …}
			upgrade(e)
		}
		openReq.onsuccess = (e) => {
			this.db = e.target.result
			this.db.onversionchange = () => {
				this.db.close()
				log("A new version is ready. Please reload or close this tab!")
			}
			this.#opening.resolve()
		}
	}

	static get request() { return request }

	async each(store, fn) {
		return await this.transaction(store, s => {
			s.openCursor().onsuccess = (e) => {
				/** @type {IDBCursorWithValue} */
				const cursor = e.target.result
				if (!cursor) return;
				fn(cursor.value)
				cursor.continue()
			}
		})
	}

	async get(store, key) {
		return await this.transaction(store, s => s.get(key))
	}

	async getAll(store, key, query, count) {
		return await this.transaction(store, s => s.getAll(query, count))
	}

	async count(store, key, query) {
		return await this.transaction(store, s => s.count(query))
	}

	async add(store, item) {
		return await this.readWrite(store, os => os.add(item))
	}

	async delete(store, key) {
		return await this.readWrite(store, os => os.delete(key))
	}

	async update(store, key, fnOrPartial) {
		return await this.map(store, key, function partialUpdate(v) {
			if (typeof fnOrPartial == 'function') {
				fnOrPartial(v)
			} else {
				Object.assign(v, fnOrPartial)
			}
			return v
		})
	}

	async map(store, key, fn) {
		return await this.readWrite(store, async s => {
			// console.log(s.transaction)
			const v = await request(s.get(key))
			if (v != null) return s.put(fn(v))
		})
	}

	/**
	 * @template {Parameters<typeof this.transaction>} P
	 * @param {P[0]} store 
	 * @param {P[1]} fn 
	 */
	async readWrite(store, fn) {
		return await this.transaction(store, fn, 'readwrite')
	}

	/**
	 * @param {string|string[]} store 
	 * @param {(store: IDBObjectStore) => any} fn 
	 * @param {IDBTransactionMode} mode 
	 */
	transaction(store, fn, mode = 'readonly') {
		return new Promise((resolve, reject) => {
			const tx = this.db.transaction(store, mode)
			tx.onerror = () => reject(tx.error)
			const r = fn(tx.objectStore([store].flat()[0]))
			const p = r instanceof IDBRequest ? request(r) : r
			tx.oncomplete = p instanceof Promise
				? () => resolve(p)
				: resolve
		}).then(r => r instanceof IDBRequest ? r.result : r)
	}
}

function request(/** @type {IDBRequest} */ r) {
	return new Promise((res, reject) => {
		r.onsuccess = e => res(e.target.result)
		r.onerror = reject
	})
}

/*
window.db = new DB('testdb', 1, (/** @type {IDBVersionChangeEvent} * / e) => {
	if (e.oldVersion == 0 && e.newVersion == 1) {
		const db = event.target.result;
		const s = db.createObjectStore('links', { keyPath: 'url' });
		// s.createIndex('tags', 'tags', { unique: false }); // multi
	} else {
		throw Error('todo uprade db') // TODO abort?
	}
})
await db.ready
*/
