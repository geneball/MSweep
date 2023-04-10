// fmt.js
//	import { asBStr, asTxt, asChrs, padSpc, O, H, I  } 		from './fmt.js'
import { AltoInstr } from './altoinst.js'

export function asBStr( data ){
	let txt = ''
	let cnt = ( data[0]>>8 ) & 0xff
	let nwds = ((cnt+1) & 1)? ( cnt+2 )/2 : (cnt+1)/2
	if ( nwds > data.length ) nwds = data.length
	for (let i=0; i < nwds; i++){
		let wd = data[ i ]
		txt += String.fromCharCode( ( wd>>8 ) & 0xff )
		txt += String.fromCharCode( wd & 0xff )
	}
	txt = txt.substring( 1, cnt+1 )
	txt = txt.replace( /\n/g, '\\n' )
	txt = txt.replace( /\t/g, '\\t' )
	txt = txt.replace( /\r/g, '\\r' )
	return txt
}
export function asTxt( data ){
	let txt = ''
	for (let i=0; i < data.length; i++ ){
		let wd = data[ i ]
		txt += String.fromCharCode( ( wd>>8 ) & 0xff )
		txt += String.fromCharCode( wd & 0xff )
	}
	return txt.replace(/\r\n/g, '<br>')
}
export function asChrs( data ){
	let txt = ''
	for (let i=0; i < data.length; i++ ){
		let wd = data[ i ]
		txt += String.fromCharCode( ( wd>>8 ) & 0xff )
		txt += String.fromCharCode( wd & 0xff )
	}
	return txt.replace(/[^ -~]/g, '.')
}

var pad = '000000'
export function padSpc( enab ){		// true => O)) & I() pad with spaces instead of zeros
	pad = enab? '         ':'000000000'
}
export function	O( v ){		// => 6 ch octal
	if (v==undefined) return 'undefi'
	let s = v.toString(8)
	return pad.substring(0,6-s.length) + s
}
export function	H( v ){		// => 4 ch hex
	if (v==undefined) return 'undf'
	let s = v.toString(16)
	return pad.substring(0,4-s.length) + s
}
export function	CH( v ){		// => 0x hex
	if (v==undefined) return 'undf'
	return '0x' + v.toString(16)
}

var AI = null
export function	I( v ){		// display v as AltoInstruction opcode
	if (AI == null ) AI = new AltoInstr()
	let a = AI.frInstr( wd )
	return AI.toStr( a )
}
