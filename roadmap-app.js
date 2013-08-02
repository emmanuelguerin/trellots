var fillObject = function (arr, obj) {
	$.each(arr, function (i, elt) {
		obj[elt.id] = elt;
	});
};

var viewModel = function() {
	var self = this;
	trelloAuth.call(self);
	
	self.boards = {};
	self.lists = {};
	self.cards = ko.observableArray();
	self.onLogin(function () {
		Trello.get("member/me/boards?filter=organization&lists=open", function (boards) {
			fillObject(boards, self.boards);
			$.each(boards, function (i, board) {
				fillObject(board.lists, self.lists);
				$.each(board.lists, function (i, list) {
					list.idBoard = board.id;
				});
			});
			console.log(self.boards);
			console.log(self.lists);
			Trello.get("boards/0dMWr9FO/cards?fields=name,idList,url", function (cards) {
				self.cards($.map(cards, function (card) { 
					return { 
						pid: getCardPid(card.name), 
						name: cleanCardName(card.name), 
						weight: getCardCost(card.name), 
						list: self.lists[card.idList].name,
						sprint: getSprint(card, self.lists[card.idList]),
						board: 'board',
						url: card.url
						} 
				}));
			});
		});
	});
};

$(document).ready(function() {
	var model = new viewModel();
	ko.applyBindings(model);
	$("body").removeClass("loading");
	Trello.authorize({
		interactive:false,
		success: model.onAuthorize
	});

});