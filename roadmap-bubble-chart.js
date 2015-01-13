Date.prototype.addDays = function(days) {
    var newDate = new Date(this.valueOf());
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

Date.prototype.subDays = function(days) {
    var newDate = new Date(this.valueOf());
    newDate.setDate(newDate.getDate() - days);
    return newDate;
};

(function ($) {

    var charts = [];

    $.fn.roadmapBubbleChart = function(options) {
        this.each(function(){
            charts.push(new RoadmapBubbleChart(this, options));
        });
    };

    $.fn.roadmapBubbleChart.defaults = {
        margin:{top:60, right:60, bottom:100, left:60},
        width:1000,
    };

    $.fn.update = function() {
        RoadmapBubbleChart.prototype.update();
    };

    var RoadmapBubbleChart = function(elem, options) {
        this.elem = elem;
        this.$elem = $(elem);
        this.init(options);
        return this.$elem;
    };

    RoadmapBubbleChart.prototype = {

        'init':function(options) {
            var self = this;
            self.data = options.data;
            self.options = $.extend({}, $.fn.roadmapBubbleChart.defaults, options);
            delete options['data'];

            self.innerWidth = self.options.width - self.options.margin.left - self.options.margin.right;

            earliest = self.earliestDate(self.data);
            latest = self.latestDate(self.data);
            self.startDate = new Date(earliest.getFullYear(), earliest.getMonth(), 01);
            self.endDate = new Date(latest.getFullYear(), latest.getMonth(), 27);
            self.yScaleMax = self.maxEffort(self.data);
            self.yScaleMax +=  self.yScaleMax * 0.5;
            self.yMiddle = self.yScaleMax / 2;

            self.colorScale = d3.scale.category10();

            self.xScale = d3.time.scale()
                .domain([self.startDate, self.endDate])
                .range([0, self.innerWidth]);

            self.height = self.xScale(self.startDate.addDays(self.yScaleMax)) + self.options.margin.top + self.options.margin.bottom;
            self.innerHeight = self.height - self.options.margin.top - self.options.margin.bottom;
            self.yScale = d3.scale.linear()
                .domain([0, self.yScaleMax])
                .range([self.innerHeight, 0]);

            self.xAxisMonths = d3.svg.axis()
                .scale(self.xScale)
                .orient("bottom")
                .ticks(d3.time.months, 1)
                .tickFormat(d3.time.format("%b '%y"))
                .tickSize(40)
                .tickPadding(-5);

            self.xAxisWeeks = d3.svg.axis()
                .scale(self.xScale)
                .orient("bottom")
                .ticks(d3.time.weeks, 1)
                .tickFormat(d3.time.format(""))
                .tickSize(20);

            self.xAxisDays = d3.svg.axis()
                .scale(self.xScale)
                .orient("bottom")
                .ticks(d3.time.days, 1)
                .tickFormat(d3.time.format(""))
                .tickSize(10);

            self.svg = d3.select("body").append("svg")
                .attr("width", self.options.width)
                .attr("height", self.height)
                .append("g")
                    .attr("transform", "translate(" + self.options.margin.left + "," + self.options.margin.top + ")");

            self.circles = self.svg.selectAll("ellipse")
                .data(self.data)
                .enter()
                    .append("ellipse")
                    .attr("class", "circle")
                    .attr("cx", function(d) { return self.calcCX(d, self); })
                    .attr("cy", self.yScale(self.yMiddle))
                    .attr("rx", function(d) { return self.calcRX(d, self); })
                    .attr("ry", function(d) { return self.calcRY(d, self); })
                    .attr("fill", function(d, i) { return self.colorScale(i); })
                    .attr("stroke", "#AAAAAA")
                    .attr("stroke-width", 2);

            self.circleLabels = self.circles.select("text")
                .data(self.data)
                .enter()
                    .append("text")
                    .attr("class", "circle-label")
                    .attr("x", function(d) { return self.calcCX(d, self); })
                    .attr("y", self.yScale(self.yMiddle))
                    .attr("text-anchor", "middle")
                    .text(function(d) { return d.label; });

            self.startLines = self.circles.select("line")
                .data(self.data)
                .enter()
                    .append("line")
                    .attr("class", "vertical-line")
                    .attr("x1", function(d) { return self.xStartLine(d, self); })
                    .attr("y1", self.yScale(self.yMiddle))
                    .attr("x2", function(d) { return self.xStartLine(d, self); })
                    .attr("y2", self.yScale(0))
                    .attr("stroke", function(d, i) { return self.colorScale(i); })
                    .attr("stroke-width", 1);

            self.endLines = self.circles.select("line")
                .data(self.data)
                .enter()
                    .append("line")
                    .attr("class", "vertical-line")
                    .attr("x1", function(d) { return self.xEndLine(d, self); })
                    .attr("y1", self.yScale(self.yMiddle))
                    .attr("x2", function(d) { return self.xEndLine(d, self); })
                    .attr("y2", self.yScale(0))
                    .attr("stroke", function(d, i) { return self.colorScale(i); })
                    .attr("stroke-width", 1);

            self.horizontalLine = self.svg.append("line")
                .attr("id", "horizontal-line")
                .attr("x1", 0)
                .attr("y1", self.yScale(self.yMiddle))
                .attr("x2", self.innerWidth)
                .attr("y2", self.yScale(self.yMiddle))
                .attr("stroke", "#000000")
                .attr("stroke-width", 1)
                .style("stroke-dasharray", ("10, 5"));

            self.tickLength = self.xScale(self.startDate) + self.xScale(self.startDate.addDays(30));
            self.svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0, " + self.innerHeight +")")
                .call(self.xAxisMonths)
                .selectAll("text")
                    .attr("class", "x-axis-label")
                    .attr("text-anchor", "middle")
                    .attr("transform", "translate(" + self.tickLength / 2 + ", 0)");

            self.svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0, " + self.innerHeight + ")")
                .call(self.xAxisWeeks);

            self.svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0, " + self.innerHeight + ")")
                .call(self.xAxisDays);
        },

        'update':function(){

        },

        'getDataArray':function(data, label) {
            var dataArray = [];
            $.each(data, function(i, d) {
                dataArray.push(d[label]);
            });

            return dataArray;
        },

        'parseDate':function(date) {
            var parts = date.split(".");
            return new Date(parts[2], (parts[0] - 1), parts[1]);
        },

        'totalDays':function(start, end) {
            var self = this;
            if (typeof start === "string") { start = self.parseDate(start); }
            if (typeof end === "string") { end = self.parseDate(end); }

            var oneDay = 24 * 60 * 60 * 1000;
            return Math.abs((start.getTime() - end.getTime()) / oneDay);
        },

        'totalWeekdays':function(start, end) {
            var self = this;
            if (typeof start === "string") { start = self.parseDate(start); }
            if (typeof end === "string") { end = self.parseDate(end); }

            weekdayFunctions = [d3.time.mondays, d3.time.tuesdays, d3.time.wednesdays, d3.time.thursdays, d3.time.fridays];
            result = 0;
            $.each(weekdayFunctions, function(i, func) {
                result += func(start, end.addDays(1)).length;
            });
            return result;
        },

        'totalWeekendDays':function(start, end) {
            var self = this;
            if (typeof start === "string") { start = self.parseDate(start); }
            if (typeof end === "string") { end = self.parseDate(end); }

            weekdayFunctions = [d3.time.sundays, d3.time.saturdays];
            result = 0;
            $.each(weekdayFunctions, function(i, func) {
                result += func(start, end.addDays(1)).length;
            });
            return result;
        },

        'earliestDate':function(data) {
            var self = this;
            dates = [];
            $.each(self.getDataArray(data, "start"), function(i, d) {
                dates.push(self.parseDate(d));
            });

            return new Date(Math.min.apply(null, dates));
        },

        'latestDate':function(data) {
            var self = this;
            dates = [];
            $.each(self.getDataArray(data, "end"), function(i, d) {
                dates.push(self.parseDate(d));
            });

            return new Date(Math.max.apply(null, dates));
        },

        'maxTotalDays':function(data) {
            var self = this;
            var maxRange = {duration: 0, start: "", end: ""};
            $.each(data, function(i, d) {
                var days = self.totalDays(d.start, d.end);
                if (days > maxRange.duration) {
                    maxRange.duration = days;
                    maxRange.start = d.start;
                    maxRange.end = d.end;
                }
            });
            return maxRange;
        },

        'maxEffort':function(data) {
            var max = 0;
            $.each(data, function(i, d) {
                var effort = d.effort / d.manpower;
                if (effort > max) { max = effort; }
            });
            return max;
        },

        'startOffset':function(d){
            return this.totalDays(this.startDate, d.start);
        },

        'endOffset':function(d){
            return this.totalDays(this.startDate, d.end);
        },

        'totalDaysHalf':function(d){
            return this.totalDays(d.start, d.end) / 2;
        },

        'calcCX':function(d, self){
            var days = self.totalDaysHalf(d);
            return self.xScale(self.startDate.addDays(days + self.startOffset(d)));
        },

        'calcRX':function(d, self){
            var days = self.totalDaysHalf(d);
            return self.xScale(self.startDate.addDays(days));
        },

        'calcRY':function(d, self){
            var effort = d.effort / (d.manpower * 2);
            var weekdays = (self.totalWeekdays(d.start, d.end) / 2);
            var ratio = effort / weekdays;
            return (ratio * self.calcRX(d, self));
        },

        'xStartLine':function(d, self){
            var days = self.totalDaysHalf(d);
            var cxDate = self.startDate.addDays(days + self.startOffset(d));
            return self.xScale(cxDate.addDays(self.totalDays(cxDate, d.start)));
        },

        'xEndLine':function(d, self){
            var days = self.totalDaysHalf(d);
            var cxDate = self.startDate.addDays(days + self.startOffset(d));
            return self.xScale(cxDate.subDays(self.totalDays(cxDate, d.start)));
        },
    };

})(jQuery);