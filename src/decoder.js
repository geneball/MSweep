/*
 JsAlto Xerox Alto Emulator
 Copyright (C) 2016  Seth J. Morabito

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see
 <http://www.gnu.org/licenses/>.
 */

const AltoIoTable = {
	//0x6000: "CYCLE"  // ac0 left rotate by (instr & 0xf) or (ac1 & 0xf) if instr 0000
	//0x6900: "JSRII" // ac3=pc+1, pc = mem[ mem[ pc+disp ] ] 
	//0x6A00: "JSRIS" // ac3=pc+1, pc = mem[ mem[ ac2+disp ] ] 
	//0x6e00: "CONVERT" // ac0=dest bitmap word - nwds, ac3 = fontbase+charcode,
						// ac2+disp: [ nwds, dba ] dba bit address, 0..15 left to right
						// 0460: 0x0000, 0x0001, 0x0003, 0x0007, ... 0x7fff, 0xffff
	0x6210: "MUL",	// ac0 = (ac0 + (ac1 * ac2))>>16, ac1 = (ac0 + (ac1 * ac2)) & 0xffff
	0x6211: "DIV",  // ac1 = (ac0,ac1 / ac2), ac0 = (ac0,ac1 rem ac2) skip unless overflow
	0x6203: "RCLK", // ac0 = mem[0430], (ac1 & 0x03ff) = 38usec clock
	0x6204: "SIO", // start IO
	0x6205: "BLT", // ac0 = src-1, ac1= last dest, ac3 = -wdcnt
	0x6206: "BLKS", // ac0 = data-1, ac1=last dest, ac3 = -wdcnt
    0x6207: "SIT",  // start interval timer
    0x6208: "JMPRAM",
    0x6209: "RDRAM",
    0x620a: "WRTRAM",
    0x620c: "VERSION",
    0x620d: "DREAD", // ac0 = mem[ac3], ac1 = mem[ac3 xor 1]
    0x620e: "DWRITE", // mem[ac3] = ac0, mem[ac3 xor 1] = ac1
    0x620f: "DEXCH", // t=mem[ac3], mem[ac3]=ac0, ac0=t, 
					//  t=mem[ac3 xor 1], mem[ac3 xor 1]=ac1, ac1=t
    0x6212: "DIAGNOSE1",
    0x6213: "DIAGNOSE2",
    0x6214: "BITBLT", // ac0: 0, ac2: bbtable, 
    0x6215: "XMLDA",
    0x6216: "XMSTA"
}
const AltoDisp = {
	0x6000: "CYCLE",
	0x6900: "JSRII",
	0x6A00: "JSRIS",
	0x6700: "CONVERT"
}
const InstructionClass = {
    MEM:         0x0000,
    LDA:         0x2000,
    STA:         0x4000,
    ALTO_SPEC_1: 0x6000,
    ALTO_SPEC_2: 0x7000
}
const AlcFunctions = {
    0x000: "COM",
    0x100: "NEG",
    0x200: "MOV",
    0x300: "INC",
    0x400: "ADC",
    0x500: "SUB",
    0x600: "ADD",
    0x700: "AND"
}
const AlcShift = {
    0x00: "",
    0x40: "L",
    0x80: "R",
    0xc0: "S"
}
const AlcCarry = {
    0x00: "",
    0x10: "Z",
    0x20: "O",
    0x30: "C"
}
const AlcSkip = {
    0x0: "",
    0x1: "SKP",
    0x2: "SZC",
    0x3: "SNC",
    0x4: "SZR",
    0x5: "SNR",
    0x6: "SEZ",
    0x7: "SBN"
}
const MemFunction = {
    0x0000: "JMP",
    0x0800: "JSR",
    0x1000: "ISZ",
    0x1800: "DSZ"
}
const MemIndex = {
    PAGEZERO:    0x000,
    PCRELATIVE:  0x100,
    AC2RELATIVE: 0x200,
    AC3RELATIVE: 0x300
}
var LitGens = null

var AI = null

export class Mem {
	constructor( data, swap ){
		this.data = data
		this.swap = swap
	}
	setSwap( swap ){
		swap = swap==undefined? !this.swap : swap
		this.swap = swap
	}
	setAddr( a, wd ){
		let a2 = a * 2
		this.data[ a2 ] = wd >> 8
		this.data[ a2+1 ] = wd & 0xff
	}
	W( addr ){
		let a2 = addr*2
		let byt0 = a2 < this.data.length? this.data[a2] : 0
		let byt1 = a2+1 < this.data.length? this.data[a2+1] : 0
		
		let wd = this.swap? ((byt1 << 8) + byt0) : ((byt0 << 8) + byt1)
		if ( wd > 32768*2 ) debugger
		if (( wd & 0xffff0000 ) != 0 ) debugger
		return wd
	}
}

export class Fmt {
	static SP = '                                                 '
	static Z = '0000000'
	static PadL( w, s ){ 
		return Fmt.SP.substring( 0, w-s.length) + s
	}
	static PadZ( w, s ){ 
		return Fmt.Z.substring( 0, w-s.length) + s
	}
	static PadR( w, s ){ 
		return s + Fmt.SP.substring( 0, w-s.length )
	}
	static OW( v ){
		if (v==undefined) return ''
		
		let s = v.toString(8)
		if (s.length > 6){
			let hex = v.toString(16)
			let binary = v.toString(2)
			debugger
		}
		return Fmt.PadZ( 6, s )
	}
	static OB( v ){
		let s = v.toString(8)
		return Fmt.PadZ( 3, s )
	}
	static HW( v ){
		let s = v.toString(16)
		return Fmt.PadZ( 4, s )
	}
	static HB( v ){
		let s = v.toString(16)
		return Fmt.PadZ( 2, s )
	}
	static CW( wd ){
		let ch0 = String.fromCharCode( wd >> 8 ), ch1 = String.fromCharCode( wd & 0xff )
		let s = ch0 + ch1
		return s.replace(/[^ -~]/g, '.')
	}
}
export class Decoder {
	static decodeInstr( mem, addr, st ){
		if (AI==null){
			AI = new AltoInstr()
		}
		let is = { a: addr } 
		let wd = mem.W(addr)
		let is2 = AI.frInstr( wd )
		let instr = AI.toInstr( is2 )
		if ( instr != wd ) debugger
		is.hwd = Fmt.HW(wd)
		is.ha = Fmt.HW( addr )
		is.txt = Decoder.disassembleInstruction( addr, wd )
		is.instr = wd
		is.skip = ''
		if ( (wd & 0x8000) == 0x8000 ){ // ALC 
			is.op = AlcFunctions[ wd & 0x700 ]
			is.src = (wd >> 13) & 0x3
			is.dst = (wd >> 11) & 0x3
			is.nostore = (wd & 0x8) != 0
			is.shift = AlcShift[ wd & 0xc0 ]
			is.carry = AlcCarry[ wd & 0x30 ] 
			is.skip = AlcSkip[ wd & 0x7 ]
			if ( is.nostore && is.skip!='' ){
				if ( is.op=='MOV' && is.carry=='')
					is.test = is.skip=='SZR'? `skip r${is.src} == 0`:`skip r${is.src} != 0`
				if ( is.op=='ADC' && is.shift=='L' && is.carry=='' )
					is.test = `skip r${is.src} < r${is.dst}`
			}
			if ( is.op=='SUB' && is.src==is.dst && !is.nostore )
				if (is.shift=='L' && is.carry=='Z'){
					is.lit = `r${is.dst} = 1`
					st.r[ is.dst ] = 1
				} else if (is.shift=='' && is.carry==''){
					is.lit = `r${is.dst} = 0`
					st.r[is.dst] = 0
				}
			if ( is.op=='MOV' && !is.nostore ){
				is.lit = `r${is.dst} = r${is.src}`
				st.r[ is.dst ] = st.r[ is.src ]
			}
			if ( is.op=='INC' && !is.nostore ){
				is.lit = `r${is.dst}++`
			}
		} else if ( (wd & 0xe000) == 0x6000 ){ // Alto
		  is.op = AltoIoTable[ wd ]
		  if ( is.op==undefined ){
			is.disp =  wd & 0xff
			is.op = AltoDisp[ wd & 0xff00 ]
			if ( is.op==undefined ) is.op = "TRAP"
			if ( is.op=='DIV' ) is.skip = 'ERR'
			if ( is.op=='CONVERT' ) is.skip = 'WIDE'
			if ( is.op=='JSRII' ){
				is.ea = addr + is.disp
				is.staticAddr = mem.W( is.ea )
			}
		  }			
		} else { // mem ref
			if ((wd&0xe000)==0){ // jmp,jsr,isz,dsz
				is.op = MemFunction[ wd&0x1800 ] 
				if (is.op=='ISZ' || is.op=='DSZ')
					is.skip = 'SZR'
			} else {
				is.op = (wd&0x6000)==0x2000? 'LDA' : 'STA'
				is.reg = ( wd >> 11 ) & 0x3
			}
			is.indirect = (wd & 0x400) != 0
			is.index = (wd & 0x300)>>8
			is.disp = Decoder.signExtendByte( wd & 0xff )
			is.ea = is.disp 
			if (is.index==1){
				is.ea += addr	// pc relative
				if ( is.indirect ){
					is.ea = mem.W( is.ea )   // static ref
					is.staticAddr = is.ea
				}
				let val = mem.W( is.ea )
				if ( !is.indirect && is.op == 'LDA' ){
					is.mem = `r${is.reg} = ${Fmt.OW(val)}=${val}`
					st.r[ is.reg ] = val
				}
			}
			if ((is.op=='LDA' || is.op=='STA') && is.index==2 ){ // frame ref
				let fr = is.disp > 3? `arg${is.disp-4}` : `frm${is.disp}`
				if ( is.op == 'LDA' ){
					st.r[ is.reg ] = st.fr[ is.disp ]
					is.mem =  `r${is.reg} = ${fr} (${st.fr[is.disp]})`
				} else {
					st.fr[ is.disp ] = st.r[ is.reg ]
					is.mem = `${fr} = r${is.reg} (${st.r[is.reg]})`
				}
			}
		}
		return is
	}
	static isRelJSR( wd ){
		return (wd & 0xFF00)==0x0900
	}
	static isJSRII( wd ){
		return (wd & 0xFF00)==0x6900
	}
	static JSRIItarget( mem, addr ){
		let instr = mem.W( addr )
		let off = addr + (instr & 0xff)
		let stataddr = mem.W( off )
		let codeaddr = mem.W( stataddr )
		console.log( `${Fmt.OW(addr)}: ${Fmt.OW(instr)} .+${Fmt.OW(instr & 0xff)}=${Fmt.OW(off)} stat:${Fmt.OW(stataddr)}: ${Fmt.OW(codeaddr)}` )
		return codeaddr
		//return mem.W(  mem.W( codelink ))
	}
	static nextPC( mem, address ){
		let instructionWord = mem.W( address )
		//console.log( `${Fmt.OW(address)}: ${Fmt.OW(instructionWord)}` )
		switch ( instructionWord & 0xe000 ){
            case InstructionClass.LDA:
            case InstructionClass.STA:
				return [ address + 1 ]
				
            case InstructionClass.ALTO_SPEC_1:
            case InstructionClass.ALTO_SPEC_2:
				let topbits = (instructionWord & 0xff00)
				if (topbits == 0x6900 ) // JSRII skips nargs
					return [ address+2 ]
				if (topbits == 0x6a00 ) // JSRIS
					debugger
				
            case InstructionClass.MEM:
				var func = MemFunction[instructionWord & 0x1800]
				if ( func == 'JMP' || func == 'JSR' )
					return [ Decoder.calcMemAddr( mem, address ) ]
                return [ address+1, address+2 ]
				
            default:
				var skip = AlcSkip[instructionWord & 0x7]
				if (skip==0) return [ address+1 ]
                return [ address+1, address+2 ]
		}
	}
	static calcMemAddr( mem, address ){
		let instructionWord = mem.W( address )
        var indirect = (instructionWord & 0x400) !== 0
        var index = instructionWord & 0x300
        var disp = Decoder.signExtendByte(instructionWord & 0xff)
		switch (index){
            case MemIndex.PAGEZERO:
				return indirect? mem.W( disp ) : disp
			case MemIndex.PCRELATIVE:
				let ea = address + disp
				return indirect? mem.W( ea ) : ea
            case MemIndex.AC2RELATIVE:
            case MemIndex.AC3RELATIVE:
				debugger
				return -1 
		}
	}
    static disassembleInstruction( address, instructionWord ){    // Returns a string containing the disassembled instruction
        switch (instructionWord & 0xe000) {
            case InstructionClass.MEM:
                return Decoder.disassembleMem(address, instructionWord)
            case InstructionClass.LDA:
            case InstructionClass.STA:
                return Decoder.disassembleLoadStore(address, instructionWord)
            case InstructionClass.ALTO_SPEC_1:
            case InstructionClass.ALTO_SPEC_2:
                return Decoder.disassembleAltoSpecific(address, instructionWord)
            default:
                return Decoder.disassembleAlc(address, instructionWord)
        }
    }
    static signExtendByte( num ) {	// Sign extend a 8-bit number to JS's 64-bit representation
        if ((num & 0x80) !== 0) {
            return -(256 - num);
        }
        return num
    }
    static disassembleMem( address, instructionWord ) {
        var result = []

        var func = MemFunction[instructionWord & 0x1800]
        var indirect = (instructionWord & 0x400) !== 0
        var index = instructionWord & 0x300
        var disp = Decoder.signExtendByte(instructionWord & 0xff)

        switch (index) {
            case MemIndex.PAGEZERO:
                result.push(func)
                if (indirect) { result.push("@") }
                result.push(" ")
                result.push(disp.toString(8))
                break
            case MemIndex.PCRELATIVE:
                result.push(func)
                if (indirect) { result.push("@") }
                result.push(" .+")
                result.push(disp.toString(8))
                result.push("   ;(")
                result.push((disp + address).toString(8))
                result.push(")")
                break
            case MemIndex.AC2RELATIVE:
                result.push(func)
                if (indirect) { result.push("@") }
                result.push(" AC2+")
                result.push(disp.toString(8))
                break
            case MemIndex.AC3RELATIVE:
                result.push(func)
                if (indirect) { result.push("@") }
                result.push(" AC3+")
                result.push(disp.toString(8))
                break
            default:
                throw "Unexpected index type"
        }
        return result.join("")
    }
    static disassembleLoadStore( address, instructionWord ) {
        var result = []

        var ac = (instructionWord & 0x1800) >>> 11
        var indirect = (instructionWord & 0x400) !== 0
        var index = instructionWord & 0x300
        var disp = Decoder.signExtendByte(instructionWord & 0xff)

        var inst = ((instructionWord & 0x6000) === InstructionClass.LDA) ? "LDA" : "STA"

        switch (index) {
            case MemIndex.PAGEZERO:
                result.push(inst)
                if (indirect) { result.push("@") }
                result.push(" ")
                result.push(ac)
                result.push(",")
                result.push(disp.toString(8))
                break
            case MemIndex.PCRELATIVE:
                result.push(inst)
                if (indirect) { result.push("@") }
                result.push(" ")
                result.push(ac)
                result.push(",.+")
                result.push(disp.toString(8))
                result.push("   ;(")
                result.push((disp + address).toString(8))
                result.push(")")
                break
            case MemIndex.AC2RELATIVE:
                result.push(inst)
                if (indirect) { result.push("@") }
                result.push(" ")
                result.push(ac)
                result.push(",AC2+")
                result.push(disp.toString(8))
                break
            case MemIndex.AC3RELATIVE:
                result.push(inst)
                if (indirect) { result.push("@") }
                result.push(" ")
                result.push(ac)
                result.push(",AC3+")
                result.push(disp.toString(8))
                break
            default:
                throw "Unexpected index type"
        }
        return result.join("")
    }
    static disassembleAltoSpecific(address, instructionWord) {
        var result = []

        // Check for alto-specific instructions that do not use DISP field
        if (AltoIoTable[instructionWord] !== undefined) {
            result.push(AltoIoTable[instructionWord])
        } else {
            var topBits = (instructionWord & 0xff00)
            switch (topBits) {
                case 0x6000:
                    result.push("CYCLE ")
                    result.push((instructionWord & 0xf).toString(8))
                    break

                case 0x6900:
                    result.push("JSRII ")
                    result.push((instructionWord & 0xff).toString(8))
                    result.push("   ;(")
                    result.push((address + (instructionWord & 0xff)).toString(8))
                    result.push(")")
                    break

                case 0x6a00:
                    result.push("JSRIS ")
                    result.push((instructionWord & 0xff).toString(8))
                    break

                case 0x6e00:
                    result.push("CONVERT ")
                    result.push((instructionWord & 0xff).toString(8))
                    break

                default:
                    // Unimplemented, treat as a TRAP to either ROM or RAM
                    result.push("TRAP")
                    break
            }
        }
        return result.join("")
    }
    static disassembleAlc(address, instructionWord) {
        var result = []

        var srcAC = (instructionWord & 0x6000) >>> 13
        var dstAC = (instructionWord & 0x1800) >>> 11
        var func = AlcFunctions[instructionWord & 0x700]
        var shift = AlcShift[instructionWord & 0xc0]
        var carry = AlcCarry[instructionWord & 0x30]
        var noLoad = ((instructionWord & 0x8) !== 0)
        var skip = AlcSkip[instructionWord & 0x7]

        result.push(func)
        result.push(shift)
        result.push(carry)
        if (noLoad) { result.push("#") }
        result.push(" ")
        result.push(srcAC)
        result.push(",")
        result.push(dstAC)

        if (skip !== "") {
            result.push(",")
            result.push(skip)
        }
        return result.join("")
    }
	static getStrLiteral( mem, addr ){
		let wd = mem.W( addr )  
		let cnt = wd>>8
		let s = '' 
		for (let i=0; i < (cnt+1)/2; i++)
			s += Fmt.CW( mem.W(addr+i) )
		return `"${s.substring(1)}"`
	}
    static dumpCode( mem, startAddress, endAddress ) {
		let s = ''
        for ( var a = startAddress; a < endAddress; a++ ) {
            var word = mem.W( a ) //	memoryBus.readFromBus(a, TaskType.EMULATOR, false);
            var result = []
            result.push( Fmt.OW( a ) + ':')
            result.push( Fmt.OW( word ) ) // octal
			result.push( Fmt.HW( word ) )
			result.push( Fmt.CW( word ) ) // chars
            result.push( Decoder.disassembleInstruction(a, word) ) // instruction
            s += result.join("   ") + '\n'
        }
		return s
    }
	static dumpData( mem, startAddress, endAddress, ashex, asoct, astxt ){
		let s = '', a = startAddress
		while ( a < endAddress ){
			let oct = '', hex = '', txt = ''
			for ( let i=0; i<8; i++ ){
				let wd = mem.W( a + i )
			
				oct += ' ' + Fmt.OW( wd )
				hex += ' ' + Fmt.HW( wd )
				txt += Fmt.CW( wd )
			}
				
			s += Fmt.OW( a ) + ':' 
			if (ashex) s += ' ' + hex
			if (asoct) s += ' ' + oct 
			if (astxt) s += ' ' + txt
			s += '\n'
			a += 8
		}
		return s
	}
}

export class AltoInstr {
	constructor(){
		this.AI = {}
		let memFs   = [ 'ind', 'idx', 'disp' ]
		let LdStaFs = [ 'ind', 'idx', 'disp', 'reg' ]
		let AlcFs   = [ 'src', 'dst', 'shft', 'cry', 'nld', 'skip' ]
		let AltoF   = [ 'disp' ]
		this.opDef = { 
			jmp:      { op: 0x0000, Fs: memFs },
			jsr:      { op: 0x0800, Fs: memFs },
			isz:      { op: 0x1000, Fs: memFs },
			dsz:      { op: 0x1800, Fs: memFs },
			lda:      { op: 0x2000, Fs: LdStaFs }, 
			sta:      { op: 0x4000, Fs: LdStaFs }, 
			com:      { op: 0x8000, Fs: AlcFs },
			neg:      { op: 0x8100, Fs: AlcFs }, 
			mov:      { op: 0x8200, Fs: AlcFs },
			inc:      { op: 0x8300, Fs: AlcFs },
			adc:      { op: 0x8400, Fs: AlcFs },
			sub:      { op: 0x8500, Fs: AlcFs },
			add:      { op: 0x8600, Fs: AlcFs },
			and:      { op: 0x8700, Fs: AlcFs },
			cycle: 	  { op: 0x6000, Fs: AltoF },
			jsrii: 	  { op: 0x6900, Fs: AltoF },
			jsris: 	  { op: 0x6a00, Fs: AltoF },
			convert:  { op: 0x6e00, Fs: AltoF },
			trap:     { op: 0x6000, Fs: AltoF },
			mul:      { op: 0x6210, Fs: [] }, 
			div:      { op: 0x6211, Fs: [] }, 
			rclk:     { op: 0x6203, Fs: [] },  
			sio:      { op: 0x6204, Fs: [] },  
			blt:      { op: 0x6205, Fs: [] },  
			blks:     { op: 0x6206, Fs: [] }, 
			sit:      { op: 0x6207, Fs: [] },  
			jmpram:   { op: 0x6208, Fs: [] },  
			rdram:    { op: 0x6209, Fs: [] },   
			wrtram:   { op: 0x620a, Fs: [] },  
			version:  { op: 0x620c, Fs: [] },  
			dread:    { op: 0x620d, Fs: [] },  
			drwite:   { op: 0x620e, Fs: [] },  
			dexch:    { op: 0x620f, Fs: [] },  
			diag1:	  { op: 0x6212, Fs: [] },  
			diag2:    { op: 0x6213, Fs: [] }, 
			bitblt:   { op: 0x6214, Fs: [] },  
			xmlda:    { op: 0x6215, Fs: [] },  
			xmsta:    { op: 0x6216, Fs: [] }
		}
		this.opDefByOp = []
		for ( let defnm of Object.getOwnPropertyNames(this.opDef) ){
			let def = this.opDef[ defnm ]
			this.opDefByOp[ def.op ] = { nm: defnm, Fs: def.Fs }
		}
		this.msk = { 
			disp: 0x00ff, idx: 0x0300, ind: 0x0400, reg: 0x1800, 
			src: 0x6000, dst: 0x1800, shift: 0x00c0, cry: 0x0030, nld: 0x0040, skip: 0x0007
		}
		this.shift = { 
			disp: 0,  idx: 8, ind: 10, reg: 11, src: 13, dst: 11,
			shift: 6, cry: 4, nld: 3, skip: 0
		}
		this.decodeTree =  
			{ msk: 0x8000, 
			  opts: [
				{ vals: [0x8000], 
					opmsk: 0x8700 //com,neg,mov,inc,adc,sub,add,and
				}, 
				{ vals: [0x0000], 
					msk: 0xe000, 
					opts: [
						{ vals: [ 0x2000, 0x4000 ], opmsk: 0xe000 }, //lda,sta
						{ vals: [ 0x0000 ], 
							msk: 0xf800,
							opts: [ 
								{ vals: [ 0x0000, 0x0800, 0x1000, 0x1800 ],
								  opmsk: 0xf800  //jmp,jsr,isz,dsz
								},
							]
						},
						{ vals: [ 0x6000 ], 
						    msk: 0xff00,
							opts: [
								{ vals: [ 0x6200 ],
								  opmsk: 0xffff 
								}, //mul,div,...
								{ vals: [ 0x6000, 0x6900, 0x6a00, 0x6e00, 0x6000 ],
 								  opmsk: 0xff00 //cycle,jsrii,jsris,convert,trap
								} 
							]
						}
					]
				}
			  ]
			}
		this.codePatts = [
			{ // entry: sta 3 2,1; jsr 370, fr, jsr 367
			  seq: [ 
				{ cd: 0x5a01, mk: 0xffff, nm: 'Sv ret addr' },
				{ cd: 0x0cf8, mk: 0xffff, nm: 'GetFrame' },
				{ cd: 0x0000, mk: 0x0000, nm: 'frame_size',
					FrameSz: { m:0xffff, sh:0 } 
				},
				{ cd: 0x0cf7, mk: 0xffff, nm: 'SvArgs' } 
			  ]
			},
			{ // r3 = strL 
			  cd: 0x0900, mk: 0xff00, nm: 'r3 = strL',
			  L: { m: 0xff, sh:0 }
			},
			{ // rX = argY
			  cd: 0x2204, mk: 0xe700, nm: 'rX = argY', 
			  X: { m: 0x1800, sh:11 },
			  Y: { m: 0x00ff, sh: 0 }
			}
		]
	}
	toInstr( a ){
		let def = this.opDef[ a.op ]
		let instr = def.op
		for ( let f of def.Fs ){
			if ( a[f] == undefined ) debugger
			instr += a[f] << this.shift[f]
		}
		return instr
	}
	toStr( a ){
		return  a.op + '       '.substring(a.op.length) 
	}
	frInstr( instr ){
		let op = 0
		let res = {}
		let dm = this.decodeTree
		let dbg = ` ${H(instr)} `
		for(let i=0;i<4;i++){
			let v = instr & dm.msk
			dbg += ` &M ${H(v)} `
			for ( let o of dm.opts ){
				if ( o.vals.includes( v )){
					if ( o.opmsk != undefined ){
						op = instr & o.opmsk
						let opDef = this.opDefByOp[ op ]
						res.op = opDef.nm
						dbg += ` ${res.op} `
						for ( let f of opDef.Fs )
							res[f] = (instr & this.msk[f]) >> this.shift[f]
						return res
					} else
						dm = o
				}
			}
		}
		console.log(dbg)
		debugger
	}
	

}













