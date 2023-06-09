
	import { err, msg, statusMsg, question } 				from './msg.js'
	import { HUI, GUI } 									from './htmlui.js'
	import './gb53.css'
	import { saveAs } 										from 'file-saver'
	import dayjs											from 'dayjs'
	import Rand, {PRNG} 									from 'rand-seed'
	
export class App {
	constructor( title ){
		this.title = title
		let el = HUI.gEl('title')
		if (el) el.innerText = this.title
		
		this.Version = '1.0_5/28/23'

		this.registerSW()
		
		let ng = Number( localStorage.getItem( 'nGames' ))
		if ( ng==undefined ) localStorage.setItem( 'nGames', 0 )
		this.UserName = localStorage.getItem( 'user' )
		if ( this.UserName == undefined ) this.UserName = ''
		
		App.currApp = this
		
		this.gui = new GUI( 'header', 'hdr', '_' )

		this.gui.addBreak()
		this.gui.addButton('Reset', ()=>this.selGame())
		this.gui.addValue('Mines:', `${this.mines} - ${this.exploded}E - ${this.marked}M` )
		this.gui.addButton('Safe', ()=>this.randSafeClick()) 
		this.gui.addButton('Hist', (evt)=>this.showGames(evt) ) 
		this.gui.addButton('Play', (evt)=>this.play( 10 ) ) 

		this.opt = this.gui.addGroup('Options','Opt', true)
		this.opt.addCheckbox( 'W' )
		this.opt.setVal( 'W', true )
		this.opt.addText( 'Game', '1', ()=>this.selGame() )
		this.opt.addNumber('X', 20 )
		this.opt.addNumber('Y', 20 )
		this.opt.addNumber('Density', 20 )
		this.opt.addText( 'Username', this.UserName, (val)=>{ this.updateUser( val ) } )

		this.det = this.gui.addGroup('Details','Det', true)
	//	this.gui.addBreak()
		this.det.addValue( 'Details:', 0 )
		this.dbg = this.det.addGroup('Debug','Dbg', true)
		this.dbg.addNumber( 'zm:', 0, this.updatePos.bind(this) )
		this.dbg.addNumber( 'dx:', 0, this.updatePos.bind(this) )
		this.dbg.addNumber( 'dy:', 0, this.updatePos.bind(this) )
		this.dbg.addButton( 'Colors', ()=>this.chooseColor())
		this.dbg.addCheckbox( 'TM' )
		this.dbg.addButton( 'UnPlay', (evt)=>this.unplayLast( evt ) ) 
				
		this.maxunwinnable = 30000		
		this.winnableGames = [ 
		'45-6',		'46-8',		'68-8',		'77-9',		'87-2',		'98-11',	'99-2',		'118-7',
		'187-5',	'238-9',	'242-12',	'257-4',	'262-8',	'333-10',	'361-9',	'363-7',
		'368-2',	'384-10',	'397-6',	'426-11',	'435-5',	'442-10',	'447-2',	'450-11',
		'476-7',	'494-10',	'506-3',	'519-9',	'548-4',	'559-2',	'590-8',	'601-10',
		'645-7',	'691-15',	'693-11',	'695-10',	'730-6',	'799-10',	'813-9',	'816-3',
		'817-7',	'828-10',	'832-10',	'836-11',	'859-1',	'875-8',	'924-7',	'975-6',
		'987-5',	'992-13',	'994-15',	'1063-5',	'1082-11',	'1101-4',	'1104-8',	'1181-10',
		'1183-12',	'1203-11',	'1228-9',	'1234-4',	'1245-13',	'1372-2',	'1379-11',	'1386-7',
		'1420-9',	'1427-4',	'1444-6',	'1494-8',	'1510-9',	'1521-8',	'1536-5',	'1539-11',
		'1547-7',	'1552-6',	'1554-9',	'1562-11',	'1568-12',	'1624-2',	'1625-10',	'1636-8',
		'1640-11',	'1674-10',	'1698-10',	'1702-13',	'1717-12',	'1719-13',	'1729-9',	'1739-7',
		'1755-13',	'1783-12',	'1798-10',	'1805-6',	'1833-9',	'1844-2',	'1896-12',	'1913-10',
		'1916-3',	'1933-12',	'1958-11',	'1960-13',	'1971-6',	'1985-1',	'2013-10',	'2049-9',
		'2051-12',	'2091-5',	'2104-14',	'2115-4',	'2117-9',	'2118-7',	'2138-9',	'2141-8',
		'2154-8',	'2180-4',	'2225-10',	'2233-13',	'2272-7',	'2276-9',	'2326-13',	'2337-7',
		'2341-4',	'2372-6',	'2385-9',	'2397-5',	'2406-7',	'2417-6',	'2452-4',	'2463-3',
		'2478-14',	'2491-3',	'2510-11',	'2523-9',	'2525-8',	'2557-5',	'2564-9',	'2591-7',
		'2610-9',	'2621-12',	'2633-7',	'2643-5',	'2648-4',	'2650-2',	'2655-5',	'2660-12',
		'2669-2',	'2714-9',	'2717-2',	'2745-7',	'2756-7',	'2767-9',	'2779-7',	'2782-2',
		'2789-12',	'2798-12',	'2808-11',	'2819-6',	'2858-8',	'2862-10',	'2881-3',	'2894-12',
		'2905-3',	'2936-10',	'2954-7',	'2959-10',	'2980-14',	'3018-11',	'3025-6',	'3027-7',
		'3071-8',	'3089-9',	'3096-9',	'3103-14',	'3143-8',	'3146-3',	'3164-7',	'3219-4',
		'3300-5',	'3307-8',	'3328-3',	'3346-3',	'3366-14',	'3374-8',	'3420-12',	'3529-2',
		'3557-10',	'3566-8',	'3586-10',	'3595-11',	'3611-8',	'3619-13',	'3644-7',	'3645-2',
		'3654-9',	'3702-9',	'3703-7',	'3712-8',	'3731-5',	'3748-5',	'3755-15',	'3763-11',
		'3765-9',	'3793-5',	'3797-6',	'3823-8',	'3825-5',	'3838-7',	'3880-9',	'3901-8',
		'3923-10',	'3931-11',	'3941-3',	'3965-7',	'3974-2',	'4006-11',	'4041-9',	'4135-14',
		'4158-10',	'4182-13',	'4184-11',	'4200-8',	'4278-14',	'4302-7',	'4314-11',	'4324-8',
		'4363-5',	'4400-12',	'4449-12',	'4465-12',	'4473-9',	'4479-13',	'4494-5',	'4506-8',
		'4513-9',	'4515-6',	'4522-7',	'4535-9',	'4567-4',	'4573-5',	'4604-11',	'4606-8',
		'4624-7',	'4659-9',	'4668-10',	'4678-4',	'4680-4',	'4701-8',	'4712-13',	'4730-9',
		'4768-9',	'4804-9',	'4817-13',	'4838-6',	'4842-5',	'4849-12',	'4917-13',	'4919-11',
		'4939-5',	'4971-4',	'5012-1',	'5020-5',	'5057-14',	'5069-8',	'5070-7',	'5094-2',
		'5095-7',	'5111-11',	'5121-8',	'5143-13',	'5151-4',	'5168-4',	'5192-11',	'5195-1',
		'5199-6',	'5220-11',	'5234-10',	'5238-8',	'5247-2',	'5252-8',	'5257-2',	'5260-10',
		'5276-6',	'5309-10',	'5314-1',	'5357-2',	'5368-6',	'5428-7',	'5446-10',	'5452-6',
		'5477-12',	'5483-11',	'5510-10',	'5533-6',	'5591-10',	'5599-16',	'5617-9',	'5625-13',
		'5634-1',	'5665-5',	'5669-14',	'5695-7',	'5716-5',	'5724-6',	'5796-3',	'5814-7',
		'5833-9',	'5862-13',	'5885-4',	'6004-2',	'6011-10',	'6014-4',	'6028-1',	'6037-10',
		'6043-13',	'6045-10',	'6060-7',	'6077-14',	'6081-14',	'6102-10',	'6148-5',	'6187-6',
		'6208-4',	'6215-6',	'6216-6',	'6227-10',	'6237-14',	'6262-13',	'6279-5',	'6280-5',
		'6284-7',	'6312-10',	'6391-11',	'6409-12',	'6413-8',	'6415-8',	'6419-7',	'6420-5',
		'6425-9',	'6433-9',	'6451-8',	'6466-6',	'6472-13',	'6484-9',	'6487-2',	'6549-9',
		'6555-13',	'6572-10',	'6604-8',	'6609-14',	'6616-1',	'6629-7',	'6635-6',	'6641-9',
		'4939-5',	'4971-4',	'5012-1',	'5020-5',	'5057-14',	'5069-8',	'5070-7',	'5094-2',
		'5095-7',	'5111-11',	'5121-8',	'5143-13',	'5151-4',	'5168-4',	'5192-11',	'5195-1',
		'5199-6',	'5220-11',	'5234-10',	'5238-8',	'5247-2',	'5252-8',	'5257-2',	'5260-10',
		'5276-6',	'5309-10',	'5314-1',	'5357-2',	'5368-6',	'5428-7',	'5446-10',	'5452-6',
		'5477-12',	'5483-11',	'5510-10',	'5533-6',	'5591-10',	'5599-16',	'5617-9',	'5625-13',
		'5634-1',	'5665-5',	'5669-14',	'5695-7',	'5716-5',	'5724-6',	'5796-3',	'5814-7',
		'5833-9',	'5862-13',	'5885-4',	'6004-2',	'6011-10',	'6014-4',	'6028-1',	'6037-10',
		'6043-13',	'6045-10',	'6060-7',	'6077-14',	'6081-14',	'6102-10',	'6148-5',	'6187-6',
		'6208-4',	'6215-6',	'6216-6',	'6227-10',	'6237-14',	'6262-13',	'6279-5',	'6280-5',
		'6284-7',	'6312-10',	'6391-11',	'6409-12',	'6413-8',	'6415-8',	'6419-7',	'6420-5',
		'6425-9',	'6433-9',	'6451-8',	'6466-6',	'6472-13',	'6484-9',	'6487-2',	'6549-9',
		'6555-13',	'6572-10',	'6604-8',	'6609-14',	'6616-1',	'6629-7',	'6635-6',	'6641-9',
		'6671-5',	'6687-3',	'6688-9',	'6702-9',	'6735-6',	'6743-6',	'6748-13',	'6752-12',
		'6769-2',	'6817-4',	'6842-2',	'6847-8',	'6850-5',	'6867-6',	'6868-7',	'6898-2',
		'6901-7',	'6924-9',	'6934-14',	'6953-9',	'6990-10',	'7013-6',	'7019-1',	'7025-2', 
		'7035-3',	'7047-1',	'7050-11',	'7058-11',	'7081-7',	'7087-10',	'7105-3',	'7115-2',
		'7120-11',	'7132-12',	'7137-14',	'7152-13',	'7154-11',	'7186-6',	'7208-3',	'7266-9',
		'7273-6',	'7279-4',	'7294-5',	'7323-7',	'7327-6',	'7338-11',	'7381-13',	'7396-6',
		'7404-2',	'7434-9',	'7440-7',	'7458-1',	'7486-4',	'7525-9',	'7554-10',	'7570-7',
		'7574-10',	'7580-7',	'7595-7',	'7598-4',	'7630-9',	'7631-4',	'7635-5',	'7657-8',
		'7690-10',	'7698-8',	'7727-10',	'7729-11',	'7743-8',	'7794-3',	'7820-1',	'7828-10',
		'7992-6',	'8016-7',	'8039-9',	'8055-10',	'8057-10',	'8071-8',	'8084-9',	'8086-8',
		'8123-12',	'8126-1',	'8130-8',	'8138-8',	'8158-11',	'8236-1',	'8307-7',	'8321-13',
		'8337-11',	'8343-6',	'8376-6',	'8412-10',	'8419-8',	'8427-11',	'8429-7',	'8469-12',
		'8480-9',	'8520-5',	'8523-7',	'8541-4',	'8544-7',	'8568-2',	'8633-14',	'8664-4',
		'8681-11',	'8684-1',	'8703-12',	'8730-10',	'8734-12',	'8752-4',	'8771-10',	'8778-11',
		'8786-15',	'8794-9',	'8802-7',	'8821-8',	'8852-12',	'8856-8',	'8949-7',	'8985-1',
		'8999-6',	'9020-6',	'9031-10',	'9046-5',	'9066-11',	'9091-9',	'9125-10',	'9140-8',
		'9156-3',	'9159-9',	'9172-7',	'9183-5',	'9232-4',	'9258-7',	'9274-10',	'9283-3',
		'9297-7',	'9340-5',	'9357-9',	'9366-7',	'9369-4',	'9398-6',	'9435-9',	'9504-7',
		'9524-5',	'9590-12',	'9596-3',	'9604-1',	'9634-4',	'9635-6',	'9671-12',	'9700-7',
		'9704-6',	'9724-8',	'9727-5',	'9733-9',	'9773-10',	'9796-4',	'9820-3',	'9823-11',
		'9833-10',	'9846-5',	'9858-10',	'9940-5',	'9944-6',	'9967-1',	'9972-7',	'9978-5',
		'10008-3',	'10042-13',	'10044-12',	'10045-2',	'10056-11',	'10063-4',	'10092-9',	'10115-9',
		'10134-9',	'10173-13',	'10197-8',	'10198-5',	'10207-8',	'10230-7',	'10234-11',	'10289-8',
		'10301-8',	'10302-8',	'10316-8',	'10351-4',	'10377-10',	'10401-12',	'10432-12',	'10444-14',
		'10458-10',	'10492-7',	'10495-7',	'10497-5',	'10503-9',	'10511-4',	'10520-11',	'10556-5',
		'10568-1',	'10595-3',	'10622-12',	'10636-6',	'10644-4',	'10667-6',	'10708-16',	'10722-9',
		'10759-7',	'10837-15',	'10952-12',	'10964-13',	'10983-8',	'10995-16',	'11010-2',	'11021-10',
		'11047-4',	'11055-7',	'11058-7',	'11060-11',	'11068-6',	'11103-4',	'11127-9',	'11181-4',
		'11218-2',	'11221-7',	'11232-9',	'11235-5',	'11264-7',	'11300-5',	'11338-9',	'11377-6',
		'11396-2',	'11407-12',	'11442-2',	'11452-3',	'11494-4',	'11575-5',	'11604-2',	'11611-9',
		'11634-8',	'11642-4',	'11647-13',	'11666-5',	'11726-6',	'11757-9',	'11766-6',	'11799-14',
		'11823-10',	'11829-10',	'11838-6',	'11878-2',	'11898-9',	'11938-8',	'12002-11',	'12033-5',
		'12083-4',	'12093-5',	'12097-2',	'12125-9',	'12141-4',	'12185-4',	'12230-3',	'12231-10',
		'12245-10',	'12255-5',	'12277-16',	'12281-10',	'12290-8',	'12306-4',	'12307-9',	'12320-2',
		'12344-11',	'12368-12',	'12389-10',	'12423-9',	'12475-6',	'12483-2',	'12491-9',	'12545-7',
		'12553-7',	'12558-4',	'12623-6',	'12642-12',	'12660-9',	'12662-8',	'12681-6',	'12688-3',
		'12693-9',	'12734-8',	'12809-12',	'12818-2',	'12849-4',	'12933-11',	'12995-10',	'12997-6',
		'13024-6',	'13032-11',	'13061-13',	'13082-10',	'13115-5',	'13124-13',	'13131-6',	'13137-6',
		'13198-9',	'13209-15',	'13225-13',	'13242-3',	'13246-3',	'13260-11',	'13271-5',	'13279-12',
		'13297-5',	'13308-4',	'13334-6',	'13336-7',	'13342-13',	'13344-15',	'13413-6',	'13436-13',
		'13438-10',	'13446-10',	'13508-11',	'13517-8',	'13531-9',	'13540-9',	'13577-4',	'13585-4',
		'13602-9',	'13619-12',	'13641-3',	'13660-9',	'13684-10',	'13716-3',	'13719-8',	'13720-3',
		'13731-8',	'13737-10',	'13747-7',	'13770-4',	'13812-9',	'13814-8',	'13822-3',	'13842-10',
		'13865-8',	'13867-7',	'13876-7',	'13882-1',	'13890-3',	'13912-6',	'13937-4',	'13942-7',
		'13943-4',	'13956-10',	'13962-10',	'14002-5',	'14036-12',	'14042-9',	'14082-7',	'14085-8',
		'14112-7',	'14116-3',	'14142-10',	'14152-13',	'14167-4',	'14238-10',	'14255-12',	'14257-8',
		'14269-10',	'14354-7',	'14355-2',	'14363-4',	'14393-9',	'14395-5',	'14422-13',	'14446-12',
		'14472-8',	'14474-7',	'14484-12',	'14523-10',	'14525-14',	'14564-6',	'14599-4',	'14606-8',
		'14631-1',	'14693-1',	'14701-4',	'14719-13',	'14741-1',	'14750-9',	'14756-7',	'14759-5',
		'14787-10',	'14789-8',	'14806-3',	'14853-13',	'14894-14',	'14912-3',	'14932-6',	'14978-11',
		'14984-9',	'14996-6',	'15015-6',	'15021-1',	'15062-9',	'15077-7',	'15107-15',	'15116-1',
		'15121-6',	'15122-7',	'15134-6',	'15152-11',	'15160-9',	'15169-2',	'15210-11',	'15212-13',
		'15218-9',	'15224-11',	'15239-7',	'15263-9',	'15268-5',	'15269-8',	'15275-11',	'15298-1',
		'15342-7',	'15380-5',	'15388-5',	'15399-7',	'15406-6',	'15415-7',	'15435-10',	'15472-9',
		'15490-8',	'15519-11',	'15549-15',	'15566-10',	'15616-16',	'15646-11',	'15665-8',	'15668-6',
		'15716-14',	'15721-8',	'15754-10',	'15755-2',	'15802-14',	'15804-10',	'15812-10',	'15854-9',
		'15860-11',	'15884-9',	'15907-6',	'15908-9',	'15948-6',	'15966-4',	'15967-8',	'15988-6',
		'15991-4',	'16007-2',	'16018-13',	'16028-5',	'16034-13',	'16040-11',	'16058-10',	'16075-14',
		'16103-10',	'16118-10',	'16137-8',	'16148-10',	'16165-12',	'16167-14',	'16173-9',	'16206-7',
		'16207-10',	'16208-3',	'16229-5',	'16246-9',	'16279-10',	'16301-7',	'16304-7',	'16311-11',
		'16321-13',	'16339-16',	'16366-7',	'16369-11',	'16404-2',	'16438-3',	'16452-7',	'16460-8',
		'16464-1',	'16469-5',	'16481-12',	'16483-10',	'16491-10',	'16500-4',	'16552-2',	'16553-8',
		'16570-6',	'16578-6',	'16582-7',	'16612-13',	'16620-6',	'16637-10',	'16646-3',	'16661-12',
		'16673-9',	'16681-11',	'16691-7',	'16692-6',	'16711-3',	'16713-3',	'16715-1',	'16734-5',
		'16749-5',	'16766-4',	'16777-10',	'16780-3',	'16802-2',	'16827-1',	'16831-1',	'16846-9',
		'16852-6',	'16856-4',	'16872-13',	'16875-3',	'16905-12',	'16913-6',	'16918-7',	'16967-7',
		'16979-12',	'17003-4',	'17064-7',	'17068-9',	'17072-6',	'17081-9',	'17086-6',	'17117-8',
		'17153-7',	'17155-11',	'17156-1',	'17185-11',	'17207-12',	'17236-2',	'17245-5',	'17253-4',
		'17267-3',	'17310-2',	'17313-8',	'17331-13',	'17347-8',	'17437-8',	'17456-8',	'17460-7',
		'17503-3',	'17528-9',	'17530-10',	'17540-9',	'17558-13',	'17592-5',	'17605-9',	'17622-6',
		'17628-1',	'17634-10',	'17636-10',	'17651-9',	'17680-10',	'17688-11',	'17696-10',	'17752-3',
		'17813-16',	'17887-9',	'17913-11',	'17928-5',	'17937-11',	'17953-10',	'17964-12',	'17999-11',
		'18013-5',	'18037-9',	'18039-10',	'18072-5',	'18077-11',	'18090-5',	'18098-11',	'18114-8',
		'18172-8',	'18173-5',	'18176-8',	'18193-5',	'18201-4',	'18220-3',	'18226-2',	'18249-2',
		'18295-5',	'18327-11',	'18353-9',	'18363-10',	'18383-7',	'18391-10',	'18420-5',	'18459-12',
		'18460-1',	'18468-3',	'18483-11',	'18493-6',	'18533-11',	'18536-11',	'18542-13',	'18576-5',
		'18651-5',	'18713-11',	'18717-7',	'18719-10',	'18739-10',	'18783-8',	'18794-6',	'18795-9',
		'18805-5',	'18821-14',	'18823-10',	'18828-8',	'18829-1',	'18840-11',	'18860-9',	'18862-6',
		'18873-12',	'18900-8',	'18906-9',	'18908-12',	'18909-2',	'18935-10',	'18941-11',	'18982-7',
		'18998-11',	'19019-4',	'19043-5',	'19048-8',	'19057-12',	'19070-13',	'19087-9',	'19116-2',
		'19130-3',	'19141-1',	'19193-11',	'19199-4',	'19242-1',	'19254-10',	'19289-8',	'19296-7',
		'19306-2',	'19320-9',	'19343-5',	'19387-4',	'19440-5',	'19446-7',	'19461-9',	'19475-7',
		'19492-5',	'19495-8',	'19507-7',	'19551-12',	'19559-7',	'19566-6',	'19578-3',	'19581-7',
		'19594-3',	'19651-8',	'19693-4',	'19722-7',	'19745-10',	'19753-6',	'19757-11',	'19766-12',
		'19815-6',	'19817-5',	'19840-8',	'19863-2',	'19893-9',	'19903-11',	'19908-4',	'19911-7',
		'19913-6',	'19916-7',	'19945-3',	'19953-3',	'19960-7',	'19983-10',	'19998-1',	'20001-12',
		'20039-9',	'20051-6',	'20066-11',	'20076-13',	'20089-4',	'20106-10',	'20122-11',	'20185-8',
		'20190-9',	'20212-13',	'20227-8',	'20270-11',	'20307-4',	'20380-4',	'20437-12',	'20463-5',
		'20505-4',	'20528-10',	'20535-3',	'20592-11',	'20608-4',	'20611-6',	'20636-6',	'20686-9',
		'20688-8',	'20745-10',	'20773-6',	'20779-7',	'20823-3',	'20836-9',	'20847-13',	'20866-8',
		'20881-13',	'20898-12',	'20907-7',	'20914-4',	'20928-5',	'20955-9',	'20994-5',	'21030-7',
		'21036-10',	'21051-10',	'21056-4',	'21075-8',	'21091-14',	'21095-4',	'21101-12',	'21113-13',
		'21188-5',	'21212-9',	'21237-11',	'21243-9',	'21260-5',	'21263-10',	'21301-8',	'21314-13',
		'21318-12',	'21336-13',	'21373-9',	'21382-7',	'21409-5',	'21434-12',	'21456-6',	'21503-2',
		'21507-8',	'21518-8',	'21520-7',	'21550-7',	'21591-6',	'21607-4',	'21608-7',	'21624-14',
		'21632-4',	'21666-12',	'21682-12',	'21698-11',	'21699-1',	'21701-4',	'21716-10',	'21730-9',
		'21798-8',	'21858-5',	'21866-8',	'21868-8',	'21870-5',	'21886-4',	'21926-12',	'21944-8',
		'21954-12',	'21967-2',	'21988-10',	'21992-9',	'22012-7',	'22022-8',	'22043-6',	'22049-7',
		'22053-10',	'22057-12',	'22065-4',	'22067-6',	'22076-3',	'22122-10',	'22137-4',	'22147-2',
		'22167-10',	'22184-11',	'22198-13',	'22215-12',	'22217-12',	'22219-10',	'22225-7',	'22250-7',
		'22272-13',	'22324-10',	'22344-9',	'22352-12',	'22354-10',	'22368-4',	'22382-5',	'22454-7',
		'22456-7',	'22461-4',	'22464-10',	'22491-13',	'22496-3',	'22498-8',	'22533-7',	'22541-2',
		'22548-7',	'22551-12',	'22559-9',	'22563-10',	'22566-7',	'22588-10',	'22589-3',	'22592-13',
		'22601-7',	'22624-5',	'22631-10',	'22686-13',	'22696-10',	'22735-12',	'22778-13',	'22796-9',
		'22823-9',	'22840-11',	'22875-5',	'22903-5',	'22921-10',	'22949-11',	'22950-4',	'22970-3',
		'23051-5',	'23062-12',	'23082-7',	'23097-8',	'23103-7',	'23111-8',	'23135-11',	'23138-3',
		'23155-2',	'23167-10',	'23169-11',	'23171-10',	'23206-8',	'23221-9',	'23224-2',	'23225-11',
		'23258-12',	'23288-11',	'23290-10',	'23327-6',	'23382-15',	'23400-6',	'23408-9',	'23434-11',
		'23444-11',	'23511-12',	'23543-12',	'23568-9',	'23584-13',	'23590-8',	'23624-5',	'23662-10',
		'23678-5',	'23723-8',	'23734-9',	'23770-11',	'23772-11',	'23806-11',	'23818-4',	'23889-8',
		'23928-3',	'23954-9',	'23981-10',	'23988-8',	'24010-5',	'24082-3',	'24085-11',	'24116-14',
		'24126-9',	'24127-2',	'24128-7',	'24152-10',	'24248-10',	'24260-5',	'24290-4',	'24299-8',
		'24306-6',	'24308-6',	'24318-14',	'24328-7',	'24350-2',	'24363-12',	'24380-4',	'24414-10',
		'24418-13',	'24483-10',	'24560-7',	'24570-14',	'24571-3',	'24633-6',	'24646-10',	'24655-11',
		'24662-2',	'24686-12',	'24692-8',	'24696-8',	'24740-5',	'24766-12',	'24775-13',	'24783-13',
		'24804-13',	'24847-4',	'24873-8',	'24895-4',	'24896-9',	'24898-9',	'24910-8',	'24911-2',
		'24918-10',	'24984-8',	'25090-10',	'25095-8',	'25096-4',	'25097-7',	'25100-7',	'25112-9',
		'25135-6',	'25138-5',	'25144-4',	'25163-9',	'25180-11',	'25225-8',	'25238-9',	'25240-6',
		'25242-7',	'25285-1',	'25304-7',	'25338-9',	'25380-10',	'25390-12',	'25410-11',	'25426-10',
		'25431-5',	'25436-9',	'25438-4',	'25455-8',	'25484-9',	'25494-8',	'25503-3',	'25516-14',
		'25519-5',	'25523-4',	'25579-14',	'25593-12',	'25605-9',	'25619-8',	'25627-9',	'25641-12',
		'25663-8',	'25670-13',	'25678-6',	'25682-5',	'25737-6',	'25831-12',	'25841-11',	'25844-2',
		'25872-2',	'25910-10',	'25950-10',	'25968-7',	'25979-4',	'26037-7',	'26039-9',	'26070-7',
		'26149-12',	'26184-12',	'26213-6',	'26235-3',	'26268-9',	'26271-5',	'26279-14',	'26315-11',
		'26323-10',	'26327-13',	'26341-12',	'26353-14',	'26371-8',	'26387-8',	'26419-6',	'26469-8',
		'26490-13',	'26528-7',	'26530-8',	'26545-2',	'26566-6',	'26570-9',	'26596-14',	'26615-9',
		'26631-12',	'26641-13',	'26651-9',	'26653-4',	'26684-6',	'26696-8',	'26702-13',	'26722-5',
		'26780-1',	'26783-5',	'26798-11',	'26826-9',	'26847-7',	'26877-10',	'26878-2',	'26920-12',
		'26933-3',	'26949-6',	'26967-11',	'26969-13',	'26972-4',	'26974-8',	'26985-11',	'27012-7',
		'27038-12',	'27050-5',	'27066-4',	'27068-3',	'27113-5',	'27126-5',	'27137-11',	'27180-3',
		'27234-11',	'27279-12',	'27283-11',	'27311-1',	'27316-9',	'27328-11',	'27331-1',	'27332-12',
		'27340-10',	'27344-10',	'27354-3',	'27357-15',	'27363-10',	'27365-12',	'27368-2',	'27386-10',
		'27405-3',	'27406-10',	'27420-1',	'27423-11',	'27434-5',	'27440-5',	'27469-8',	'27592-8',
		'27596-9',	'27600-14',	'27634-10',	'27636-12',	'27648-7',	'27654-12',	'27671-4',	'27697-4',
		'27704-13',	'27741-3',	'27777-9',	'27800-9',	'27841-6',	'27842-7',	'27876-7',	'27884-14',
		'27888-9',	'27893-4',	'27928-10',	'27939-10',	'27943-10',	'27949-6',	'27951-6',	'27952-8',
		'27953-2',	'27961-9',	'27965-6',	'27981-8',	'28047-5',	'28076-3',	'28077-8',	'28123-3',
		'28134-11',	'28135-2',	'28138-7',	'28174-7',	'28235-8',	'28271-7',	'28283-8',	'28315-2',
		'28319-5',	'28326-7',	'28338-10',	'28388-4',	'28420-3',	'28431-11',	'28433-9',	'28437-7',
		'28443-6',	'28452-9',	'28458-12',	'28476-5',	'28479-2',	'28482-7',	'28488-4',	'28496-9',
		'28508-10',	'28513-10',	'28516-4',	'28521-12',	'28535-10',	'28542-3',	'28568-2',	'28571-10',
		'28617-10',	'28641-4',	'28644-5',	'28671-7',	'28682-4',	'28688-5',	'28721-12',	'28727-11',
		'28805-9',	'28830-10',	'28835-10',	'28885-3',	'28913-1',	'28950-8',	'28952-3',	'28963-9',
		'28993-8',	'29034-9',	'29046-4',	'29062-12',	'29075-5',	'29134-7',	'29150-8',	'29201-7',
		'29218-12',	'29225-1',	'29268-1',	'29341-6',	'29347-7',	'29349-7',	'29352-13',	'29390-13',
		'29424-6',	'29438-4',	'29456-14',	'29468-13',	'29470-10',	'29483-10',	'29494-8',	'29495-8',
		'29511-15',	'29539-9',	'29547-8',	'29552-10',	'29580-15',	'29587-7',	'29599-11',	'29622-10',
		'29650-10',	'29656-10',	'29780-11',	'29795-5',	'29807-8',	'29853-4',	'29868-8',	'29917-5',
		'29948-6',	'29949-10',	'29973-9'	

		]
		this.dbg.addButton( 'Eval', (evt)=>this.findWinnable() ) 
		this.dbg.addNumber( 'mxG', this.maxunwinnable+100 )
		this.errCnt = 0
		this.selGame()
	
		let tgt = HUI.gEl('lower')
		tgt.addEventListener( 'contextmenu', (evt)=>evt.preventDefault() )
		tgt.addEventListener( 'mouseup', (evt)=>{ this.gridClick( evt ) })
		
		tgt.addEventListener( 'touchstart', (evt)=>{ this.touchstart( evt )}, { passive: false } )
		tgt.addEventListener( 'touchend', (evt)=>{ this.touchend( evt )}, { passive: false } )
		tgt.addEventListener( 'touchmove', (evt)=>{ this.touchmove( evt )}, { passive: false } )
		document.addEventListener( 'keydown', (evt)=>{ this.keydown( evt )} )
		window.addEventListener( 'resize', (evt)=>{ this.resizeApp() } )
		document.addEventListener('click', (evt)=>{	HUI.setClass( 'Popup', 'hide', true ) })
	}
	updateUser( nm ){
		this.UserName = nm
		localStorage.setItem( 'user', nm )	
		if ( this.gameisover ){
			let ng = localStorage.getItem( 'nGames' )-1
			let gmstr = localStorage.getItem( `G${ng}` )
			try {
				let gm = JSON.parse( gmstr )
				gm.unm = this.UserName
				localStorage.setItem( `G${ng}`, JSON.stringify(gm) )
			} catch { 
				console.log('error parsing game') 
				debugger
			}
		}
	}
	rand(){
		if ( this.gameNum == 0 )
			return Math.random()
		else
			return this.randgen.next()
	}
	unplayLast(){
		while ( this.gamesteps.length > 0 ){
			let mv = this.gamesteps.pop()
			this.unplay( mv.y, mv.x )
			if ( mv.user ){
				this.selCell( mv.y, mv.x )
				return
			}
		}
	}
	findWinnable(){
		let ugm = Number( this.maxunwinnable ), wgm = 0
		let ln = this.winnableGames.length
		if (ln > 0) 
			wgm = Number( this.winnableGames[ ln-1 ].split('-')[0] )
		let gm = ugm > wgm? ugm : wgm
		let mxG = Number( this.dbg.getVal('mxG'))
		for (let i = gm+1; i <= mxG; i++)
			setTimeout( this.evalGame.bind( this, i ), (i-gm)*100 )	
	}
	evalGame( num ){
		if ( this.winnableGames == undefined ){
			this.winnableGames = []
		}
		this.opt.setVal( 'Game', num )
		this.resetApp()
		let maxSafe = 0
		while ( this.randSafeClick() ) maxSafe++
		
		let lowestwinnable = -1
		this.opt.setVal( 'W', false )
		for ( let nRS = maxSafe; nRS >= 0; nRS-- ){
			this.opt.setVal('Game', `${num}-${nRS}` )
			this.selGame()
			this.PlayTest = true
			this.play( 0 )
			this.PlayTest = false
			
			if ( this.secret == 0 ) 
				lowestwinnable = nRS
			
			if ( this.secret > 0 ) break   // found a non-winnable version
		}
		if ( lowestwinnable < 0 ){
			msg( `Game ${num}-${maxSafe} non-winnable`)
			this.maxunwinnable = num
			//console.log( `maxunwinnable: ${this.maxunwinnable}` )
		} else {
			let wgm = `${num}-${lowestwinnable}`
			this.winnableGames.push( wgm )
			this.opt.setVal('Game', wgm )
			this.resetApp()
			//console.log( `winnable: '${this.winnableGames[ this.winnableGames.length-1]}'` )
			msg( `Game ${wgm} is winnable` )
			
			let txt = ' winnables: '
			for (let i=0; i<this.winnableGames.length; i++){
				txt += `	'${this.winnableGames[i]}',`
				if (i%8==7){ console.log( txt ); txt = '' }
			}
			console.log( txt )
		}
	}
	play( dly ){
		if ( dly==undefined ) dly = 10
		this.game.unm = 'Auto'
		this.toDo = []
		for (let y=0; y<this.YSize; y++)
			for (let x=0; x<this.XSize; x++){
				let id = this.gID( y, x )
				if ( HUI.hasClass(id, ['cleared','freed','exploded','bombed'] )){
					if ( this.grid[y][x] == 0 )
						this.markProcessed( y, x )
					else
						this.toDo.push( { y: y, x: x } )
				}
			}
			
		this.cntSinceChg = 0
		this.playStep( dly )
	}
	playStep( dly ){
		while ( this.toDo.length > 0 && this.cntSinceChg < this.toDo.length*3 ){
			let c = this.toDo.pop()
			let ev = this.evalCell( c )	// => null or { y: x: nmines: marked: secret:[] }
			
			if ( ev != null ){
				msg( `L${this.toDo.length} C${this.cntSinceChg} [${ev.y},${ev.x}] ${ev.nmines}M ${ev.marked}M ${ev.secret.length}S` )
				this.selCell( c.y, c.x )
				if ( this.playCell( ev )){
					this.cntSinceChg = 0
				} else {
					this.toDo.unshift( ev )
					this.cntSinceChg++
				}
				if ( dly > 0 )
					setTimeout( this.playStep.bind(this, dly ), dly )
				else
					this.playStep( dly )
				return
			}
		}
		msg( `Play stopped: L${this.toDo.length} C${this.cntSinceChg}` )
	}
	evalCell( cell ){
		let id = this.gID( cell.y, cell.x )
		if ( HUI.hasClass(id, ['secret', 'marked', 'exploded' ] )) return null

		// cell is either 'cleared', 'freed', or 'bombed'
		let adj = this.adjCells( cell.y, cell.x )
		let marked = 0
		let secNbrs = []
		for ( let n of adj ){
			let nid = this.gID( n.y, n.x )
			if ( HUI.hasClass( nid, 'secret' ))
				secNbrs.push( n )
			if ( HUI.hasClass( nid, 'marked' )) 
				marked++
		}
		if ( secNbrs.length==0 ){
			this.markProcessed( id )
			return null	// neighbors all marked or cleared
		}
		let nmines = this.grid[ cell.y ][ cell.x ]	// # of adjacent mines
		
		return { y: cell.y, x: cell.x, nmines: nmines, marked: marked, secret: secNbrs }
	}
	markProcessed( yOrId, x ){	// set as 'processed' to visually mark
		let id = x==undefined? yOrId : this.gID( yOrId, x )
		
		if ( HUI.hasClass( id, 'bombed' ))
			HUI.setClass( id, 'procbombed', true )
		else
			HUI.setClass( id, 'processed', true )
			
		HUI.setClass( id, ['cleared','freed','bombed','tm','t0','t1','t2','t3','t4','t5','t6','t7','t8'], false )
	}
	playCell( e ){
		if ( e.nmines < 0) debugger  // cleared mine!
		let secret = e.secret.length
		let nhidden = e.nmines - e.marked
		if ( nhidden > 0 && secret != nhidden ) 
			return false 		// not enough info yet
		
		this.markProcessed( e.y, e.x )
		for ( let n of e.secret ){
			let nid = this.gID( n.y, n.x )
			this.playChanged = true
			if ( nhidden==0 ){ // no unmarked mines -- clear all secret
				this.clearCell( n.y, n.x, false )
				this.toDo.push( { y: n.y, x: n.x } )
			} else 
				this.markCell( n.y, n.x )  // mark all secret cells
		}
		return true
	}
	minMax( v, mxv ){
		let min = v==0? 0 : v-1
		let max = v==mxv? mxv : v+1
		return [ min, max ]
	}
	adjCells( y, x ){
		let adj = []
		let [xmin,xmax] = this.minMax( x, this.XSize-1 )
		let [ymin,ymax] = this.minMax( y, this.YSize-1 )
		for ( let dy=ymin; dy<=ymax; dy++ )
			for ( let dx=xmin; dx<=xmax; dx++)
				if ( y!=dy || x!=dx ) 
					adj.push( { y:dy, x:dx } )
		return adj
	}
	registerSW(){
		if ('serviceWorker' in navigator) {
		   window.addEventListener('load', () => {
			 navigator.serviceWorker.register('/service-worker.js').then(registration => {
			   console.log('SW registered: ', registration)
			 }).catch(registrationError => {
			   console.log('SW registration failed: ', registrationError)
			 })
		   })
		 }
	}
	resizeApp(){
		this.windowW = window.innerWidth
		this.windowH = window.innerHeight
		this.headerH = HUI.gEl('header').clientHeight
	}
	addMove( y,x, user ){
		this.gamesteps.push( { x: x, y: y, user: user } )
	}
	unplay( y,x ){  // revert to original state -- secret
		this.selCell( y, x )
		let id = this.gID( y, x )
		for ( let cls of [ 'cleared','freed','marked','exploded','bombed','tm','t0','t1','t2','t3','t4','t5','t6','t7','t8' ] ){
			if ( HUI.hasClass( id, cls )){
				HUI.setClass( id, cls, false )
				if ( cls.charAt(0)!='t' ) this[cls]--
			}
		}
		HUI.setClass( id, 'secret', true )
		this.secret++
		this.showCnts()
	}
	selGame(){	// reset button
		let gm = this.opt.getVal('Game')
		if ( this.opt.getVal('W')){	 // choose a random winnable game
			let r = Math.trunc(this.winnableGames.length * Math.random())
			gm = this.winnableGames[r]
			this.opt.setVal( 'Game', gm )
			this.gameName = `CF_Gm${gm}`
			this.opt.setVal( 'X', 20 )
			this.opt.setVal( 'Y', 20 )
			this.opt.setVal( 'Density', 20 )
		} else if ( gm=='' ){
			gm = Math.trunc( Math.random()*10000 ).toString()
			this.gameName = `CF_RGm${gm}`
		} else {
			this.gameName = `CF_Gm${gm}`
		}
		let gmsf = gm.split('-')
		this.numSafe = gmsf.length<2? 0 : Number( gmsf[1] )
		
		this.randgen = new Rand( this.gameName )		
		this.resetApp()
	}
	resetApp(){
		this.errCnt = 0
		this.gameisover = false
		this.gamesteps = []
		this.resizeApp() // record winow size
		HUI.setClass( 'Popup', 'hide', true )

		let xc = this.XSize = this.opt.getVal('X')
		let yc = this.YSize = this.opt.getVal('Y')
		this.Density = this.opt.getVal('Density')/100
		this.fillField( xc, yc, this.Density )	
		this.game = { 
			ver: this.Version,
			sz: xc*yc, 
			mines: this.mines,
			name: this.gameName,
			unm: this.UserName
		}
		for (let i=0; i< this.numSafe; i++){
			this.usedFree = false
			this.randSafeClick()
		}
		
		let csz = this.cellSize = 21.25;  //HUI.gEl('m0000').offsetWidth but with fraction
		
		let data = HUI.gEl('data')
		data.style.width = `${xc*csz}px`
		data.style.height = `${yc*csz}px`

		this.longtouchtimer = 0;
		this.touchduration = 500; //length of time we want the user to touch before we do something
		this.touchZooming = false 
		this.touchDist = 0
		this.touchStartDist = 0
		this.selX = 0
		this.selY = 0
		this.usedFree = false	// first safe click is free
		
		let dataW = data.clientWidth 
		let dataH = data.clientHeight
		let hdrH = HUI.gEl('header').clientHeight
		let bodyW = window.innerWidth
		let bodyH = window.innerHeight
		let zmw = bodyW / dataW
		let zmh = (bodyH-hdrH) / dataH
		this.touchZoom = Math.trunc( (zmw < zmh? zmw : zmh) * 90 )
		this.setZoom( this.touchZoom, 0,0 )
		msg( `${this.title} ${this.gameName}` )
		this.showCnts()
	}
	clearSel(){
		HUI.setClass( this.gID( this.selY, this.selX ), 'sel', false )		
	}
	selCell( y, x ){
		this.clearSel()
		this.selY = y
		this.selX = x
		HUI.setClass( this.gID( this.selY, this.selX ), 'sel', true )
	}
	keydown( evt ){
		let y = this.selY
		let x = this.selX
		switch ( evt.key ){
			case 'ArrowUp':
			case 'i':
				this.selCell( this.clipY( y-1 ), x )
				return
			case 'ArrowDown':
			case 'k':	
				this.selCell( this.clipY( y+1 ), x )
				return
			case 'ArrowLeft': 
			case 'j':	
				this.selCell( y, this.clipX( x-1 ))
				return
			case 'ArrowRight':
			case 'l':	
				this.selCell( y, this.clipX( x+1 ))
				return
			case 's':
				this.randSafeClick()
				return
			case 'r':
				this.resetField()
				return
			case 'm':	
				this.markCell( y, x )
				return
			case ' ':
				this.doGridClick( y, x, false )
				return
			default:
		}
	}
	cntGrid( cls ){
		let cnt=0
		for (let y=0; y<this.YSize; y++){
			for (let x=0; x<this.XSize; x++){
				if ( HUI.hasClass( this.gID(y,x), cls )) 
					cnt++
				if ( cls=='cleared' && HUI.hasClass( this.gID(y,x), 'processed' ))
					cnt++
			}
		}
		return cnt
	}
	checkCnt( cnt, cls ){
		let act = this.cntGrid( cls )
		if ( act != cnt ){
			this.errCnt++
			if (this.errCnt==1) 
				console.log(`chkCnt ${cls}`)
			debugger
		}
	}
	showCnts(){
		let right=0, wrong=0
		for (let y=0; y<this.YSize; y++){
			for (let x=0; x<this.XSize; x++){
				if ( HUI.hasClass( this.gID(y,x), 'marked' )){
					if ( this.grid[y][x] < 0 ) 
						right++
					else
						wrong++
				}
			}
		}
		
		this.gui.setVal('Mines:', `${this.mines} ${this.exploded}E ${this.marked}M` )
		let err = this.errCnt == 0? '' : `${this.errCnt}E`
		this.det.setVal('Details:', `${this.mines}* (${this.marked}M ${wrong}W ${right}R) ${this.exploded}E ${this.bombed}B ${this.cleared}C ${this.freed}F ${this.secret}S ${err}` )

		for (let n of ['secret','marked','cleared','exploded','bombed']){
			this.checkCnt( this[n], n )
		}
		if ( this.secret == 0 ){
			this.gameOver()
		}
	}
	gameOver(){
		if ( this.PlayTest ) return
		if ( this.gameisover ) return	// second showCnts
		
		this.gameisover = true
	
		if (this.errCnt != 0) console.log( `${this.errCnt} errs` )
		navigator.vibrate( [100,50,100,50,200] )
		
		this.wrong = 0
		this.right = 0
		for (let y=0; y<this.YSize; y++){
			for (let x=0; x<this.XSize; x++){
				let id = this.gID(y,x)
				if ( HUI.hasClass( id, 'marked' ) ){
					if ( this.grid[y][x] < 0 ){
						this.right++
						HUI.setClass( id, 'right', true )
					} else {
						this.wrong++
						HUI.setClass( id, 'wrong', true )
					}
				}
			}
		}
		this.score = Math.round( (this.cleared - 2*(this.exploded + this.bombed) - 5*this.wrong)*100 / this.possible )
		msg( `Game Over!  ${this.gameName}  Score: ${this.score}` )
		if ( this.game.unm=='' ){
			msg('  Enter username? ', true )
			this.opt.setHidden(false)
		}
		this.game.end = dayjs().format('YYYY-MM-DD HH:mm:ss')
		this.game.score = this.score
		this.game.fre = this.freed
		this.game.clr = this.cleared
		this.game.exp = this.exploded
		this.game.bmb = this.bombed
		this.game.wrg = this.wrong
		let ng = Number( localStorage.getItem('nGames'))
		localStorage.setItem( 'nGames', ng+1 )
		let gm = this.game
		localStorage.setItem( `G${ng}`, JSON.stringify(gm) )
		//`${gm.start}..${gm.end} ${gm.unm} Sc${gm.score} Sz${gm.sz} M${gm.mines} F${gm.fre} C${gm.clr} E${gm.exp} B${gm.bmb} W${gm.wrg} V${gm.ver}` )
	}
	showGames(evt){
		evt.stopPropagation()
		if ( !HUI.hasClass( 'Popup', 'hide' )){
			HUI.setClass( 'Popup', 'hide', true )
			return
		}
		let ng = Number( localStorage.getItem('nGames'))
		let html = ''
		let user = ''
		let date = ''
		for (let i=0; i< ng; i++){
			let gmstr = localStorage.getItem( `G${i}` )
			let gm = undefined
			try {
				gm = JSON.parse( gmstr )
			} catch {
				localStorage.removeItem( `G${i}` )
			}
			if ( gm != undefined ){
				let st = dayjs( gm.start )
				let dt = st.format('D-MMM-YY')
				if ( dt != date || gm.unm != user ){
					date = dt
					user = gm.unm
					html += `${date} ${user}: <br>`
				}
				let end = dayjs( gm.end )
				html += `  ${st.format('H:mm')} ${gm.name} ${end.diff(st,'minute',true).toFixed(1)}m  &nbsp;&nbsp; Score:${gm.score} <br>`
			}
		}
		if ( this.touchHist ){
			let tH = this.touchHist
			html = `pS:${tH.panStartPt.x},${tH.panStartPt.y} <br>`
			html += `tS:${tH.touchStartPt.x},${tH.touchStartPt.y} <br>`
			html += `sD:${tH.touchStartDist} Z:${tH.touchStartZoom} <br>`
			for ( let u of tH.updt ) 
				html += ` zm:${u.zm} dx:${u.dx} dy:${u.dy} <br>`
		}
		HUI.gEl('Popup').innerHTML = html
		HUI.setClass( 'Popup', 'hide', false )
	}
	updatePos(){
		let zm = this.dbg.getVal('zm:')
		let dx = this.dbg.getVal('dx:')
		let dy = this.dbg.getVal('dy:')
		this.setZoom( zm, dy, dx )
	}	
	setZoom( zm, dy,dx ){
		zm = Number(zm)
		dy = Number(dy)
		dx = Number(dx)
	//	msg( `${dx},${dy}  ${zm}%` )
		let data = HUI.gEl('data')
		let gsize = { x: data.clientWidth, y: data.clientHeight }
		let scrsize = { x: this.windowW*100/zm, y: this.windowH*100/zm - this.headerH }
		let zf = 100/zm
		let minx = scrsize.x - gsize.x*1.2 - 20
		let miny = scrsize.y - gsize.y*1.2 - 20
		
		if ( this.dbg.getVal( 'TM' ) ) 
			msg( ` [${Math.round(scrsize.x)}->${Math.round(minx)}, ${Math.round(scrsize.y)}->${Math.round(miny)}]` )
	//msg( `${this.windowH}*${zf.toFixed(2)}-${this.headerH}=${Math.round(scrsize.y)} ? ${gsize.y} `)
		if ( scrsize.y < gsize.y )
			dy = Math.round( this.clip( dy, miny, 20 ) )
		else dy = 10
		if ( scrsize.x < gsize.x )
			dx = Math.round( this.clip( dx, minx, 20 ) )
		else dx = 10
		
		data.style.zoom = `${zm}%`
		data.style.top = `${dy}px`
		data.style.left = `${dx}px`
		//msg( ` => ${dx},${dy}  ${zm}%`, true )
		
		let hdr = HUI.gEl('header')
		let hdrw = Math.round( hdr.getBoundingClientRect().width )
		let dtaw = Math.round( data.getBoundingClientRect().width )
		//msg( ` hW,dW:${hdrw},${dtaw}` )
		let hzm = Math.round( dtaw*100/hdrw )
		if (hzm < 100) hzm = 100
		hdr.style.zoom = `${hzm}%` 
		//msg( ` & ${hzm}%`, true )
	}
	touchmove( evt ){
		if ( evt.touches.length == 2 ){
			this.touchHist = false	// {}
			let tH = this.touchHist
			
			let t1 = evt.touches.item(0)
			let t2 = evt.touches.item(1)
			this.touchPt = { x:(t1.clientX + t2.clientX)/2, y:(t1.clientY + t2.clientY)/2 }
			let xd = t1.clientX - t2.clientX
			let yd = t1.clientY - t2.clientY
			this.touchDist = Math.round( Math.sqrt(xd*xd + yd*yd))
			let data = HUI.gEl('data')
			if (this.touchZoom==undefined) this.touchZoom = 100
			if ( this.touchStartDist == 0 ){
				let r = data.getBoundingClientRect()
				let lx = data.style.left, ty = data.style.top
				//msg( `T,L=${ty},${lx}=${r.top},${r.left}` )
				this.panStartPt = { x: Number( lx.replace('px','')), y: Number( ty.replace('px','')) }
				this.touchStartPt = { x: this.touchPt.x, y: this.touchPt.y }
				this.touchStartDist = this.touchDist
				this.touchStartZoom = this.touchZoom
				if ( tH ){
					for ( let n of ['panStartPt','touchStartPt','touchStartDist','touchStartZoom'])
						tH[n] = this[n]
					tH.updt = []
				}
			}
			this.touchZoom = Math.trunc( this.touchStartZoom * (this.touchDist / this.touchStartDist) )
			let dx = Math.trunc( this.touchPt.x - this.touchStartPt.x )
			let dy = Math.trunc( this.touchPt.y - this.touchStartPt.y )
			//msg( `${this.panStartPt.x},${this.panStartPt.y} + ${dx},${dy} ` )
			
			if (tH && tH.updt)
				tH.updt.push( { zm: this.touchZoom, dy: this.panStartPt.y + dy, dx: this.panStartPt.x + dx } )
			this.setZoom( this.touchZoom, this.panStartPt.y + dy, this.panStartPt.x + dx )
		}
	}
	touchstart( evt ) {
		//msg( `T${evt.touches.length}` )
		this.clearSel()
		this.clearTouch()
		evt.preventDefault()
		if ( evt.touches.length > 1 ){
			this.touchZooming = true 
			//msg( 'TZ', true )
		} else
			this.longtouchtimer = setTimeout( this.onlongtouch.bind(this,evt), this.touchduration ); 
	}
	clearTouch(){
		if (this.longtouchtimer != 0){
			clearTimeout( this.longtouchtimer ) 
			this.longtouchtimer = 0
		}
	}
	touchend( evt ) {	
		this.clearTouch() //stops short touches from firing the event
		evt.preventDefault()
		if ( this.touchZooming ){
			//msg( `E${evt.touches.length}` )
			if ( evt.touches.length == 0 ){
				this.touchZooming = false
				this.touchStartDist = 0
			}
			return
		}
		let tgt = evt.target;
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		this.doGridClick( y, x, false )
	}
	onlongtouch( evt ){
		this.longtouchtimer = 0
		let tgt = evt.target;
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		if ( !HUI.hasClass( tgt, 'secret') && !HUI.hasClass( tgt, 'marked' ) ) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		navigator.vibrate( 60 )
		this.markCell( y, x )
		evt.preventDefault()
	}
	clip(v, min,max){
		return v < min? min : ( v > max? max : v )
	}
	clipY( y ){
		return this.clip( y, 0, this.YSize-1 )
	}
	clipX( x ){ 
		return this.clip( x, 0, this.XSize-1 )
	}
	gID( y, x ){
		if ( y<0 || y>=this.YSize ) return null
		if ( x<0 || x>=this.XSize ) return null
		return 'm' + y.toString().padStart(2,'0') + x.toString().padStart(2,'0')
	}
	fillField( xc, yc, pct ){	
		let vals = [ '*',     '',   '1',   '2',   '3',   '4',   '5',   '6',  '7',    '8' ]
		let cls = [ 'tm', 't0','t1','t2','t3','t4','t5','t6','t7','t8' ] 
		//'t19', 't06', 't03', 't00', 't07', 't01', 't08', 't04', 't09' ]
		let grid = [] 
		let blanks = this.blanks = []
		this.grid = grid
		grid[-1]= []
		grid[yc]= []
		let rle = [], runcnt = 0
		for (let y=0; y<yc; y++){
			grid[y] = []
			for (let x=0; x<xc; x++){
				if ( this.rand() < pct ){
					grid[y][x] = -1
					rle.push( runcnt )
					runcnt = 0
				} else {
					grid[y][x] = 0
					runcnt++
				}
			}
		}
		for (let y=0; y<yc; y++)
			for (let x=0; x<xc; x++)
				if (grid[y][x] >= 0){
					for (let ny=y-1; ny<y+2; ny++)
						for (let nx=x-1; nx<x+2; nx++){
							//console.log( `[${y},${x}] [${ny},${nx}]=${grid[ny][nx]}` )
							if ( grid[ny][nx] == -1 )
								grid[y][x]++;
						}
				}
		let html = ''
		this.secret = xc*yc
		this.possible = 0
		this.cleared = 0
		this.exploded = 0
		this.bombed = 0
		this.marked = 0
		this.freed = 0
		this.mines = 0
		this.wrong = 0
		this.right = 0
		for (let y=0; y<yc; y++){
			for (let x=0; x<xc; x++){
				let idx = grid[y][x]+1
				let id = this.gID(y,x)
				if ( grid[y][x]>=0 ) 
					this.possible++
				else
					this.mines++
				if (grid[y][x]==0) 
					blanks.push( [ y,x] )	
				html += `<span id="${id}" class="grd secret"> ${vals[idx]} </span>`
			} 
			html += '<br>';
		}
		HUI.gEl('data').innerHTML = html;
	}
	clearSecret( id ){
		if (!HUI.hasClass(id, 'secret')){ console.log('SECRET'); debugger }
		HUI.setClass( id, 'secret', false )
		this.secret--
		this.checkCnt( this.secret, 'secret' )
	}
	clearCell( y,x, safe, user ){	
		this.addMove( y, x, user )
		let id = this.gID(y,x)
		let g = this.grid[y][x]
		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')){ console.log('SECRET'); debugger }
	//	this.secret--
	//	HUI.setClass( id, 'secret', false )
	//	this.checkCnt( this.secret, 'secret' )
		if (safe){
			HUI.setClass( id, 'freed', true )
			this.freed++
			this.checkCnt( this.freed, 'freed' )
	//		this.possible--
		} else {
			if (HUI.hasClass( id, 'cleared')){ console.log('CLEAR'); debugger }
			HUI.setClass( id, 'cleared', true )
			this.cleared++
			this.checkCnt( this.cleared, 'cleared' )
			HUI.setClass( id, g<0? 'tm' : `t${g}`, true )	
		}
		this.showCnts()
	}
	explodeCell( y, x, user ){
		this.addMove( y, x, user )
		let id = this.gID(y,x)
		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')) debugger
	//	this.secret--
		navigator.vibrate( [50,50,100] )
	//	HUI.setClass( id, 'secret', false )
		HUI.setClass( id, 'exploded', true )
		this.exploded++
		this.showCnts()
	}
	bombCell( y, x ){
		this.addMove( y, x, false )		// alway derived
		let id = this.gID(y,x)
		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')) debugger
	//	this.secret--
	//	HUI.setClass( id, 'secret', false )
		HUI.setClass( id, 'bombed', true )
		this.bombed++
		this.showCnts()
	}
	markCell( y, x ){
		this.addMove( y, x, true ) // always user
		let id = this.gID(y,x)
		if (HUI.hasClass(id, 'marked')){  // unmark => click
			HUI.setClass( id, 'marked', false )
			this.marked--
			this.checkCnt( this.marked, 'marked' )

			HUI.setClass( id, 'secret', true )  // re-mark secret so doClick will work
			this.secret++
			this.checkCnt( this.secret, 'secret' )
			this.showCnts()
			this.doGridClick( y,x, false )
			return
		}
		if ( !HUI.hasClass(id, 'secret')) return   // can't mark cleared cell
		this.clearSecret( id )	
		HUI.setClass( id, 'marked', true )
		this.marked++
		this.checkCnt( this.marked, 'marked' )
		this.showCnts()
	}
	neighbors( y, x ){
		y = Number(y)
		x = Number(x)
		return [ [y-1,x-1], [y,x-1], [y+1,x-1], [y-1,x],[y+1,x], [y-1,x+1],[y,x+1],[y+1,x+1] ]
	}
	gridClick( evt ) {
		HUI.setClass( 'Popup', 'hide', true )
		this.clearSel()
		let tgt = evt.target
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		if (evt.button!=0){  
			this.markCell( y, x )
			evt.preventDefault()
		} else {
			this.doGridClick( y, x, false )
		}
	}
	doGridClick( y, x, safe ){
		let cid = this.gID(y,x)
		if ( !HUI.hasClass( cid, 'secret' )) return
		
		if (this.game.start==undefined){
			this.game.start = dayjs().format('YYYY-MM-DD HH:mm:ss')
			this.game.nMoves = 0
		}
		this.game.nMoves++
		if ( this.grid[y][x] < 0 ){	//detonate mine
			this.explodeStep( y,x, true )
			return
		}
		
		this.clearCell( y, x, safe, true )
		if ( this.grid[y][x]==0){  // auto-spread clearing
			this.spreadClear( y,x, safe )
		}
		this.showCnts()
	}
	spreadClear( y,x, safe ){
		let todo = this.neighbors(y,x); 
		while (todo.length>0){
			let [y2,x2] = todo.pop()
			let id = this.gID(y2,x2)
			if ( this.grid[y2][x2]>=0 && HUI.gEl(id).classList.contains('secret') ){
				this.clearCell(y2,x2, safe, false)
				if (this.grid[y2][x2]==0){
					let nbrs = this.neighbors( y2, x2 )
					todo = todo.concat( nbrs )
				}
			}
		}
	}
	explodeStep( y,x, user ){
		let id = this.gID(y, x)
		if ( HUI.hasClass( id, 'exploded' )) return
		
		HUI.setClass( id, `exploding`, true )
		this.explodeCell(y,x, user)
		let nbrs = this.neighbors( y, x )
		for ( let [y2, x2] of nbrs ){
			let id2 = this.gID(y2,x2)
			if ( id2!=null && HUI.hasClass( id2, 'secret' )){
				let g = this.grid[y2][x2]
				if ( !HUI.hasClass(id2, 'marked') || g>=0 ){
					if ( g < 0 ){
						setTimeout( this.explodeStep.bind(this, y2,x2,false), 300 )
					} else
						this.bombCell( y2,x2 )
				}
			}
		}
		setTimeout( HUI.setClass( id, 'exploding', false ), 2500 )
	}
	randSafeClick(){	// click a random blank cell
		while (this.blanks.length > 0){
			let r = Math.floor( this.rand() * this.blanks.length )
			let [y,x] = this.blanks[r]
			if ( HUI.hasClass( this.gID(y,x), 'secret' )){
				this.doGridClick( y, x, this.usedFree )
				for (let i=this.blanks.length-1; i>=0; i--){
					[y,x] = this.blanks[i]
					if ( HUI.hasClass( this.gID(y,x), ['cleared','freed'] ))
						this.blanks.splice( i, 1 )
				}
				this.usedFree = true	// further safe clicks aren't free
				return true
			}
		}
		msg('No more blanks!')
		return false
	}
	chooseExt( val ){
		App.fileExt = val=='*'? '' : val
		if ( App.fileList == undefined ) return
		if ( App.fileExt == '' ){ 
			App.selFiles = App.fileList
			return
		}
		App.selFiles = []
		for ( let f of App.fileList ){
			if ( f.toUpperCase().endsWith( App.fileExt ))
				App.selFiles.push( f )
		}
		if ( this.fileselector !=undefined ){
			HUI.loadSelect( this.fileselector, App.selFiles )
		}
	}
	chooseColor(){
		let csel = HUI.gEl('colorSel')
		csel.hidden = false
		HUI.addListener('colorSel', 'change', (evt)=>{ this.setFmt( evt ) })
		HUI.addListener('selFmt', 'click', (evt)=>{ this.selectFmt( evt ) })
	}
	selectFmt( evt ){
		HUI.gEl('colorSel').hidden = true
	}
	setFmt( ){
		let clses = ''
		let bkgs = document.getElementsByName('bkgfmt')
		for ( let i=0; i<bkgs.length; i++ )
			if (bkgs[i].checked) clses += bkgs[i].id + ' '
		let txts = document.getElementsByName('txtfmt')
		for ( let i=0; i<bkgs.length; i++ )
			if (txts[i].checked) clses += txts[i].id + ' '
		let boxs = document.getElementsByName('boxfmt')
		for ( let i=0; i<bkgs.length; i++ )
			if (boxs[i].checked) clses += boxs[i].id + ' '

		HUI.gEl('fmtexample').className = clses
	}
	setDisplayFmt( cf ){
		if ( cf.displayfmt == undefined ){
			let ext = cf.nm.substring( cf.nm.indexOf('.')+1 ).toUpperCase()
			cf.displayfmt = App.displayFmts[ ext ]
			if ( cf.displayfmt == undefined )
				cf.displayfmt = App.SWBinary
		}
		App.SW = cf.displayfmt
		for ( let sw of App.SWNames )
			this.gui.setVal( sw, App.SW[sw] )
		padSpc( App.SW.pad )
	}
	updSw(){
		let scrwd = HUI.gEl('data').clientWidth
		let charpix = (HUI.gEl('Test').clientWidth / 52)
		App.dataWidth = Math.trunc( scrwd / charpix )
		
		App.SW.pad = this.gui.getVal('pad')
		padSpc( App.SW.pad )
		App.SW.hex = this.gui.getVal('hex')
		App.SW.oct = this.gui.getVal('oct')
		App.SW.chrs = this.gui.getVal('chrs')
		App.SW.txt = this.gui.getVal('txt')
		App.SW.code = this.gui.getVal('code')
		
		this.refreshData()
	}
	getOct( files ){
		msg( `loading ${files[0].name}...` )
		files[0].text().then( (txt) => {
			//let siz = txt.length/4
			txt = txt.replace(/[\t\r]/g, ' ')
			this.data = []
			let lns = txt.split('\n')
			let a = 0
			for (let i=0; i<lns.length; i++){
				let [ num, vals ] = lns[i].split(':')
				vals = vals.trim().split(' ')
				num = parseInt(num, 8)
				if ( this.data.length != num ) debugger
				for (let j=0; j<vals.length; j++){ 
					//if ( a == this.data.length ) 
					//	this.data.resize(a+1)
					let t = vals[j].trim()
					if ( t != '' )
						this.data.push( parseInt( t, 8 ))
				}
			}
			HUI.gEl('data').innerHTML = this.showData()
		})
	}
	selFile( cf ){
		for (let f of Object.values( this.openfiles )){
			if ( f != cf )
				f.filegrp.setHidden( true )
		}
		msg( `open ${cf.nm}` )
		this.currfile = cf
		this.setDisplayFmt( cf )
		this.refreshData()
	}
	svCFile(){
		let cf = this.currfile
		let fnm = cf.nm.substring(0,cf.nm.indexOf('.')) + '.c'
		let txt = cf.Run.asCFile( fnm, cf.runGroup.getVal('vbose'))
		let blob = new Blob( [txt], {type: "text/plain;charset=utf-8"} )
		saveAs( blob, fnm )
	}
	addMsg( s ){
		this.gui.addLine( '', s )
	}
}
var jsApp = new App( 'ClearField  Jun2023.1' )
