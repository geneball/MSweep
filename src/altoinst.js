	import { asBStr, asTxt, asChrs, padSpc, O, H, CH, I  } 		from './fmt.js'
	import { msg } from './msg.js'
	import { HUI } from './htmlui.js'
	import { App } from './app.js'
	import { saveAs } from 'file-saver'

export class AltoInstr {
	constructor(){
		this.AI = {}
		let memFs   = [ 'ind', 'idx', 'disp' ]
		let LdStaFs = [ 'reg', 'ind', 'idx', 'disp' ]
		let AlcFs   = [ 'shft', 'cry', 'nld', 'src', 'dst', 'skip' ]
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
			cyc: 	  { op: 0x6000, Fs: AltoF },
			trp:	  { op: 0x6100, Fs: AltoF },
			t63:	  { op: 0x6300, Fs: AltoF },
			t64:	  { op: 0x6400, Fs: AltoF },
			t65:	  { op: 0x6500, Fs: AltoF },
			t66:	  { op: 0x6600, Fs: AltoF },
			t67:	  { op: 0x6700, Fs: AltoF },
			t68:	  { op: 0x6800, Fs: AltoF },
			jii: 	  { op: 0x6900, Fs: AltoF },
			jis: 	  { op: 0x6a00, Fs: AltoF },
			t6b:	  { op: 0x6b00, Fs: AltoF },
			t6c:	  { op: 0x6c00, Fs: AltoF },
			t6d:	  { op: 0x6d00, Fs: AltoF },
			cnv: 	  { op: 0x6e00, Fs: AltoF },
			t6f:	  { op: 0x6f00, Fs: AltoF },
			t70:     { op: 0x7000, Fs: AltoF },
			t71:     { op: 0x7100, Fs: AltoF },
			t72:     { op: 0x7200, Fs: AltoF },
			t73:     { op: 0x7300, Fs: AltoF },
			t74:     { op: 0x7400, Fs: AltoF },
			t75:     { op: 0x7500, Fs: AltoF },
			t76:     { op: 0x7600, Fs: AltoF },
			t77:     { op: 0x7700, Fs: AltoF },
			t78:     { op: 0x7800, Fs: AltoF },
			t79:     { op: 0x7900, Fs: AltoF },
			t7a:     { op: 0x7a00, Fs: AltoF },
			t7b:     { op: 0x7b00, Fs: AltoF },
			t7c:     { op: 0x7c00, Fs: AltoF },
			t7d:     { op: 0x7d00, Fs: AltoF },
			t7e:     { op: 0x7e00, Fs: AltoF },
			t7f:     { op: 0x7f00, Fs: AltoF },
			mul:     { op: 0x6210, Fs: [] }, 
			div:     { op: 0x6211, Fs: [] }, 
			rck:     { op: 0x6203, Fs: [] },  
			sio:     { op: 0x6204, Fs: [] },  
			blt:     { op: 0x6205, Fs: [] },  
			bls:     { op: 0x6206, Fs: [] }, 
			sit:     { op: 0x6207, Fs: [] },  
			jrm:     { op: 0x6208, Fs: [] },  
			rrm:     { op: 0x6209, Fs: [] },   
			wrm:     { op: 0x620a, Fs: [] },  
			vsn:     { op: 0x620c, Fs: [] },  
			drd:     { op: 0x620d, Fs: [] },  
			dwr:     { op: 0x620e, Fs: [] },  
			dex:     { op: 0x620f, Fs: [] },  
			dg1:	 { op: 0x6212, Fs: [] },  
			dg2:     { op: 0x6213, Fs: [] }, 
			bbt:     { op: 0x6214, Fs: [] },  
			xld:     { op: 0x6215, Fs: [] },  
			xst:     { op: 0x6216, Fs: [] },
		}
		this.opDefByOp = []
		for ( let defnm of Object.getOwnPropertyNames(this.opDef) ){
			let def = this.opDef[ defnm ]
			this.opDefByOp[ def.op ] = { nm: defnm, Fs: def.Fs }
		}
		this.msk = { 
			disp: 0x00ff, idx: 0x0300, ind: 0x0400, reg: 0x1800, 
			src: 0x6000, dst: 0x1800, shft: 0x00c0, cry: 0x0030, nld: 0x0008, skip: 0x0007
		}
		this.shift = { 
			disp: 0,  idx: 8, ind: 10, reg: 11, src: 13, dst: 11,
			shft: 6, cry: 4, nld: 3, skip: 0
		}
		this.fieldVals = { 
		  'ind': [ '', ' @' ],
		  'idx': [ '', ' .', ' fp', ' x3' ],
		  'reg': [ ' r0', ' r1', ' r2', ' r3' ],
		  'src': [ ' r0', ' r1', ' r2', ' r3' ],
		  'dst': [ ' r0', ' r1', ' r2', ' r3' ],
		  'shft': [ '', 'l', 'r', 's' ],
		  'cry': [ '', 'z', 'o', 'c' ],
		  'nld': [ '', '#' ],
		  'skip': [ '', ' skp', ' szc', ' snc', ' szr', ' snr', ' sez', ' sbn' ]
		}
		// 736b  &M 0000  &M 6000  &M 7300  &M 7300 
		this.decodeTree =  
			{ msk: 0x8000, cls:'top?',
			  opts: [
				{ vals: [0x8000], cls:'ALC',
					opmsk: 0x8700 //com,neg,mov,inc,adc,sub,add,and
				}, 
				{ vals: [0x0000], cls:'!ALC?',
					msk: 0xe000, 
					opts: [
						{ vals: [ 0x2000, 0x4000 ], cls:'lda/sta',
							opmsk: 0xe000 }, //lda,sta
						{ vals: [ 0x0000 ],  cls:'jmp?',
							msk: 0xf800,
							opts: [ 
								{ vals: [ 0x0000, 0x0800, 0x1000, 0x1800 ], cls:'jmp*',
								  opmsk: 0xf800  //jmp,jsr,isz,dsz
								},
							]
						},						
						{ vals: [ 0x6000 ],  cls:'alto?',
						    msk: 0xff00,
							opts: [
								{ vals: [ 0x6200 ], cls:'mul*',
								  opmsk: 0xffff 
								}, //mul,div,...
								{ vals: [ 0x6000, 0x6900, 0x6a00, 0x6e00, 
										  0x6100, 0x6300, 0x6400, 0x6500, 
										  0x6600, 0x6700, 0x6800, 0x6b00, 
										  0x6c00, 0x6d00, 0x6f00  ], cls:'cyc*',
 								  opmsk: 0xff00 //cycle,jsrii,jsris,convert,trap
								},
								{ vals: [ 0x7000, 0x7100, 0x7200, 0x7300, 
										  0x7400, 0x7500, 0x7600, 0x7700,
										  0x7800, 0x7900, 0x7a00, 0x7b00,
										  0x7c00, 0x7d00, 0x7e00, 0x7f00  ], cls:'trap7',
								  opmsk: 0xf000 //trap7
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
		if (a.op==undefined)
			return 'trX'
		return  a.op + '   '.substring(a.op.length) 
	}
	frInstr( instr ){
		let op = 0
		let res = {}
		let dm = this.decodeTree
		let dbg = ` ${H(instr)} `
		for(let i=0;i<4;i++){
			let v = instr & dm.msk
			dbg += ` ${dm.cls} ${H(v)} `
			for ( let o of dm.opts ){
				if ( o.vals.includes( v )){
					if ( o.opmsk != undefined ){
						op = instr & o.opmsk
						let opDef = this.opDefByOp[ op ]
						if (opDef==undefined) opDef = this.opDef.trp
						res.op = opDef.nm
						res.asm = res.op
						dbg += ` ${res.op} `
						for ( let f of opDef.Fs ){
							let fv = (instr & this.msk[f]) >> this.shift[f]
							res[ f ] = fv
							if ( f=='disp' ){
								if ( res.idx==0 ){ //pg0
									res.sdisp = fv
									res.asm += ` ${O(fv)}b`
								} else {
									res.sdisp = fv & 0x80? -(256-fv) : fv
									res.asm += (fv & 0x80)? `-${256-fv}.` : `+${fv}.`
								}
							} else
								res.asm += this.fieldVals[f][ res[f] ]
						}
						if ( res.skip!=undefined )
							res.skipif = this.fieldVals.skip[ res.skip ].trim()
						return res
					} else {
						dm = o
						break
					}
				}
			}
		}
		console.log(dbg)
		debugger
	}
}













