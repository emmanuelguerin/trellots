var viewModel = function() {
	var self = this;
	trelloAuth.call(self);
	
	self.lists = {};
	self.cards = ko.observableArray();
	self.onLogin(function () {
		Trello.get("boards/0dMWr9FO/lists", function (lists) {
			$.each(lists, function (i, list) {
				self.lists[list.id] = list;
			});
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