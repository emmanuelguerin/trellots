var fillObject = function (arr, obj) {
	$.each(arr, function (i, elt) {
		obj[elt.id] = elt;
	});
};


function DeferredAjax(f, opts) {
    this.deferred=$.Deferred();
    this.f=f;
	this.opts=opts;
}
DeferredAjax.prototype.invoke=function() {
    var self=this;
    console.log("Making request for ");
	console.log(self.opts);
	self.deferred.done(function () { console.log("Done request for [" + self.opts + "]");});
	self.f(self.deferred, self.opts);
};
DeferredAjax.prototype.promise=function() {
    return this.deferred.promise();
};

function repeatFunctionSync(data, f) {
	var defer = $.Deferred();
	defer.resolve();
	$.each(data, function (i, elt) {
		var da = new DeferredAjax(f, elt);
		$.when(defer).then(function() { da.invoke(); });
		defer = da;
	});
	
	return defer;
};


var viewModel = function() {
	var self = this;
	trelloAuth.call(self);
	
	self.boards = {};
	self.lists = {};
	self.cards = ko.observableArray();
	self.loading = ko.observable();
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
			
			var result = repeatFunctionSync(boards, function (defer, board) {
				var boardId = board.id;
				self.loading("Loading... " + board.name);
				Trello.get("boards/" + boardId + "/cards?fields=name,idList,url", function (cards) {
						var rows = $.map(cards, function (card) { 
							var pid = getCardPid(card.name);
							if (pid) 
							return { 
								pid: pid, 
								name: cleanCardName(card.name), 
								weight: getCardCost(card.name), 
								list: self.lists[card.idList].name,
								sprint: getSprint(card, self.lists[card.idList]),
								board: board.name,
								url: card.url
								} 
						});
						$.each(rows, function (i, row) {
							console.log(row);
							self.cards.push(row);
						});
						defer.resolve();
					});
				});
			$.when(result).then(function() { self.loading(""); });
		});
	});
};

$(document).ready(function() {
	var model = new viewModel();
	ko.applyBindings(model);
	$(".loading").removeClass("loading");
	Trello.authorize({
		interactive:false,
		success: model.onAuthorize
	});

});