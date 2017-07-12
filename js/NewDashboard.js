var messageCount = 1;
var sensorCount = 1000;
var multiplicationFactor;

initialize();

function initialize(){
	multiplicationFactor = (messageCount *sensorCount)/(1000);

	queue()
    .defer(d3.csv, "test.csv")
    .await(makeGraphs);
}

$("input[name='sensors']").on("propertychange change keyup input paste", function(){
	var tempSensors = Number($(this).val());
	if(tempSensors){
		sensorCount = tempSensors;
	}
	initialize();
});

$("input[name='messages']").on("propertychange change keyup input paste", function(){
	var tempMessages = Number($(this).val());
	if(tempMessages){
		messageCount = tempMessages;
	}
	initialize();
});

function makeGraphs(error, apiData) {
	var dataSet = apiData;
	dataSet.forEach(function(d) {
		
	});

	var ndx = crossfilter(dataSet);

	var minutesDimension = ndx.dimension(function(d) {return +d.minutes;});
    var messageGroup = minutesDimension.group().reduceSum(function(d) {return d.messages*multiplicationFactor;});
	var all = ndx.groupAll();

	var dateChart = dc.lineChart("#date-chart");
	var minMinutes = minutesDimension.bottom(1)[0].minutes;
	var maxMinutes = minutesDimension.top(1)[0].minutes;
	var totalMessages = dc.numberDisplay("#total-projects");
	var netDonations = dc.numberDisplay("#net-donations");

	var netTotalDonations = ndx.groupAll().reduceSum(function(d) {
		var total = Number(d.s3) + Number(d.aws_iot) + Number(d.greengrass) + Number(d.aws_lambda) + Number(d.step_function) + Number(d.aws_sns) + Number(d.route_53) + Number(d.dynamo_kb) + Number(d.kineses);
		return total * (9 * multiplicationFactor);
	});

	var messageCount = ndx.groupAll().reduceSum(function(d) {
		return d.messages;
	});

	function regroup(dim, cols) {
   		var _groupAll = dim.groupAll().reduce(
			function(p, v) {
				cols.forEach(function(c) {
					p[c] += Number(v[c]) * multiplicationFactor;
				});
				return p;
			},
			function(p, v) {
				cols.forEach(function(c) {
					p[c] -= Number(v[c]) * multiplicationFactor;
				});
				return p;
			},
			function() {
				var p = {};
				cols.forEach(function(c) {
					p[c] = 0;
				});
				return p;
			});
		return {
			all: function() {
				return d3.map(_groupAll.value()).entries();
			}
		};
	}

	var dim = ndx.dimension(function(r) { return r.a; });
	var sidewaysGroup = regroup(dim, ['s3', 'aws_iot','greengrass','aws_lambda','step_function','aws_sns','route_53','dynamo_kb','kineses']);
	var sidewaysRow = dc.rowChart('#resource-chart')
        .width(500).height(400)
        .dimension(dim)
        .group(sidewaysGroup)
        .elasticX(true);

	netDonations
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(netTotalDonations)
		.formatNumber(d3.format(".6s")); 

	totalMessages
		.formatNumber(d3.format(".4s"))
		.valueAccessor(function(d){return d*multiplicationFactor; })
		.group(messageCount)

	dateChart
		.width(600).height(400)
		.margins({top: 10, right: 50, bottom: 30, left: 100})
		.dimension(minutesDimension)
		.group(messageGroup)
		.renderArea(true)
		.transitionDuration(200)
		.x(d3.scale.linear().domain([minMinutes, maxMinutes]))
		.elasticY(true)
		.renderHorizontalGridLines(true)
    	.renderVerticalGridLines(true)
		.xAxisLabel("Minutes")
		.yAxis().ticks(6);

    dc.renderAll();
};