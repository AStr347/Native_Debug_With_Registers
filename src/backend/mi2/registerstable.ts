
export const DEFAULT_INDEX: number = 0xffff;

export interface RegisterNode {
	index: number;
	name: string;
	value: string;
}

export class RegistersTable {
	regs: RegisterNode[] = undefined;

	/**
	 * init regs list with given names
	 * @param registersFilter - name for filter gbd registers
	 */
	constructor(registersFilter: string[]) {
		this.regs = [];
		registersFilter.forEach(name => {
			const foradd: RegisterNode = { index: DEFAULT_INDEX, name: name, value: "" };
			this.regs.push(foradd);
		})
	}

	listExist(): boolean {
		return 0 != this.regs.length;
	}

	/**
	 * set pairs of name - index by given names list
	 * 
	 * @param names - list of names getted from gdb
	 */
	setIndexes(names: string[]){
		let new_regs: RegisterNode[] = [];
		this.regs.forEach(pair => {
			const name = pair.name;
			const inc = names.includes(name);
			if (inc) {
				const index = names.indexOf(name);
				new_regs.push({ name: name, index: index, value: "" })
			}
		});
		this.regs = new_regs;
	}

	setValues(values: {index: number, value: string}[]){
		const indexes = this.getIndexes();
		values.forEach(x => 
			{
				const indexInRegs = indexes.indexOf(x.index);
				this.regs[indexInRegs].value = x.value;
			}
		);
	}

	/*
	 * Getters for filtered names list, indexes list and values list
	 */

	getNames(): string[] {
		let result: string[] = [];
		this.regs.forEach(x => 
			{
				const index = x.index;
				if (DEFAULT_INDEX != index){
					result.push(x.name)
				}
			}
		);
		return result;
	}

	getIndexes(): number[] {
		let result: number[] = [];
		this.regs.forEach(x => 
			{
				const index = x.index;
				if (DEFAULT_INDEX != index){
					result.push(index);
				}
			}
		);
		return result;
	}

	getValues(): string[] {
		let result: string[] = [];
		this.regs.forEach(x => 
			{
				const index = x.index;
				if (DEFAULT_INDEX != index){
					result.push(x.value)
				}
			}
		);
		return result;
	}
}