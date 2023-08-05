export class DB {
	db;
	#log;
	#opening = {};
	#ready = new Promise((resolve, reject) => Object.assign(this.#opening, { resolve, reject }));

	get ready() { return this.#ready }

	constructor(name, v = 1, log = console.log.bind(console), upgrade) {
		this.#log = log;
		const openReq = indexedDB.open(name, v);
		openReq.onerror = e => this.#opening.reject(e);
		openReq.onblocked = () => log("Please close all other tabs with this site open!");
		openReq.onupgradeneeded = (/** @type {IDBVersionChangeEvent} */ e) => {
			log('onupgradeneeded', e) // { dataLoss: 'none', dataLossMessage: '', …}
			upgrade(e)
		}
		openReq.onsuccess = (e) => {
			this.db = e.target.result
			this.db.onversionchange = () => {
				this.db.close()
				log("A new version of this page is ready. Please reload or close this tab!")
			}
			this.#opening.resolve()
		}
	}

	get(store, key) {
		return new Promise(
			res => this.db.transaction(store).objectStore(store).get(key)
				.onsuccess = e => res(e.target.result)
		)
	}

	each(store, fn) {
		this.db.transaction(store).objectStore(store)
			.openCursor().onsuccess = (e) => {
				const cursor = e.target.result
				if (!cursor) return;
				fn(cursor.value)
				cursor.continue()
			};
	}

	async add(store, item) {
		return await this.readwrite(store, os => os.add(item))
	}

	async delete(store, key) {
		return await this.readwrite(store, os => os.delete(key))
	}

	// TODO not plain object?
	async update(store, key, fnOrPartial) {
		return await this.readwrite(store, s => {
			s.get(key).onsuccess = e => {
				const data = e.target.result
				if (typeof fnOrPartial == 'function') {
					fnOrPartial(data)
				} else {
					Object.assign(data, fnOrPartial)
				}
				s.put(data)
			}
		})
	}

	async readwrite(store, fn) {
		return await this.transaction('readwrite', store, fn)
	}

	transaction(mode, store, fn) {
		return new Promise((resolve, reject) => {
			const tx = this.db.transaction([store], mode)
			tx.onerror = () => reject(tx.error)
			tx.oncomplete = resolve
			fn(tx.objectStore(store))
		})
	}
}

/*
window.db = new DB('testdb', 1, undefined, (/** @type {IDBVersionChangeEvent} * / e) => {
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
