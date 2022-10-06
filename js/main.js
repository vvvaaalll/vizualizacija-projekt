
(function () {

    
    var attrArray = ["broj_zarazenih", "broj_umrlih", "broj_aktivni"]; 
    var expressed = attrArray[0]; 

    
    var chartWidth = window.innerWidth * 0.4,
        chartHeight = 500,
        leftPadding = 40,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    

    var yScalebroj_zarazenih = d3.scaleLinear()
        .range([500, 0])
        .domain([0, 270000]);

    var yScalebroj_aktivni = d3.scaleLinear()
        .range([500, 0])
        .domain([0, 1000]);


    var yScalebroj_umrlih = d3.scaleLinear()
        .range([500, 0])
        .domain([0, 5000]);

    var yScale = yScalebroj_zarazenih

    
    window.onload = setMap();

   
    function setMap() {

        
        var width = window.innerWidth * 0.55,
            height = 650;

        
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

       
        var projection = d3.geoMercator() //geoCylindricalEqualArea()
        .center([0, 10])
        .scale(6000)
        .translate([17600, 4500])
        .rotate([-180, 0]);
 
        
        var path = d3.geoPath()
            .projection(projection);

        
        d3_queue.queue()
            .defer(d3.csv, "data/cro_covid.csv") 
            .defer(d3.json, "data/cro_geo.topojson") 
            .await(callback); 

                function callback(error, csvData, cro) {

           
            croCounties = topojson.feature(cro, cro.objects.cro_geo).features;

            var states = map.append("path")
                .datum(croCounties)
                .attr("class", "counties")
                .attr("d", path);

            croCounties = joinData(croCounties, csvData);

        
            var colorScale = makeColorScale(csvData);
         
            setEnumerationUnits(croCounties, map, path, colorScale);

            setChart(csvData, colorScale);

            createDropdown(csvData);

        };

    };

 
    function joinData(croCounties, csvData) {

        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i]; 
            var csvKey = csvCounty.name; 

            for (var a = 0; a < croCounties.length; a++) {
                var geojsonProps = croCounties[a].properties; 
                var geojsonKey = geojsonProps.name; 

                if (geojsonKey == csvKey) {

                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvCounty[attr]); 
                        geojsonProps[attr] = val; 
                    });
                };
            };
        };

        return croCounties;
    };


    
    function setEnumerationUnits(croCounties, map, path, colorScale) {

        
        var counties = map.selectAll(".croCounties")
            .data(croCounties)
            .enter() 
            .append("path") 
            .attr("class", function (d) {
                return "croCounties " + d.properties.name;
            })
            .attr("d", path) 
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function (d) {
                highlight(d.properties);
            })
            .on("mouseout", function (d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        
        var desc = counties.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');

    };

    
    function makeColorScale(csvData) {
        var colorClasses = [
            "#fee5d9",
            "#fcae91",
            "#fb6a4a",
            "#de2d26",
            "#a50f15"
        ];

        
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        
        var domainArray = [];
        for (var i = 0; i < csvData.length; i++) {
            var val = parseFloat(csvData[i][expressed]);
            domainArray.push(val);
        };

       
        var clusters = ss.ckmeans(domainArray, 5);

        
        domainArray = clusters.map(function (d) {
            return d3.min(d);
        });

       
        domainArray.shift();

        
        colorScale.domain(domainArray);

        return colorScale;

    };

    
    function choropleth(props, colorScale) {

        
        var val = parseFloat(props[expressed]);

        
        if (typeof val == 'number' && !isNaN(val)) {
            return colorScale(val);
        } else {
            return "#CCC";
        };

    };

    
    function setChart(csvData, colorScale) {

        if (expressed == "broj_zarazenih") yScale = yScalebroj_zarazenih;
        else if (expressed == "broj_umrlih") yScale = yScalebroj_umrlih;
        else yScale = yScalebroj_aktivni

        
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "bar " + d.name;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);

        
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        
        var chartTitle = chart.append("text")
            .attr("x", 100)
            .attr("y", 30)
            .attr("class", "chartTitle");

        
        var yAxis = d3.axisLeft()
            .scale(yScale);

        
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight + 5)
            .attr("transform", translate);

        
        updateChart(bars, csvData.length, colorScale, chart);

        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

    };

    
    function createDropdown(csvData) {
        
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });

        
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Odaberi kriterij");

        
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) { return d })
            .text(function (d) { return d });
    };

    
    function changeAttribute(attribute, csvData) {

        
        expressed = attribute;

       
        var colorScale = makeColorScale(csvData);

        
        var counties = d3.selectAll(".croCounties")
            .transition()
            .duration(500)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale)
            });

        
        var bars = d3.selectAll(".bar")

            
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function (d, i) {
                return i * 20
            })
            .duration(100);

        updateChart(bars, csvData.length, colorScale);

    };

    
    function updateChart(bars, n, colorScale, chart) {
        if (expressed == "broj_zarazenih") yScale = yScalebroj_zarazenih;
        else if (expressed == "broj_umrlih") yScale = yScalebroj_umrlih;
        else yScale = yScalebroj_aktivni

        var yAxis = d3.axisLeft()
            .scale(yScale);

        var axis = d3.selectAll(".axis")
            .attr("transform", translate)
            .call(yAxis);





       
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })

            
            .attr("height", function (d, i) {
                return 500 - yScale(d[expressed]);
            })
            .attr("y", function (d, i) {
                return yScale(d[expressed]) + topBottomPadding;
            })

            
            .style("fill", function (d) {
                return choropleth(d, colorScale);
            })



        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " po županijama");

    };

    
    function highlight(props) {

       
        var selected = d3.selectAll("." + props.name)
            .style("stroke", "black")
            .style("stroke-width", "3");

        setLabel(props);

    };

    
    function dehighlight(props) {
        var selected = d3.selectAll("." + props.name)
            .style("stroke", function () {
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName) {

            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];



        };

        
        d3.select(".infolabel")
            .remove();

    };

    
    function setLabel(props) {
        
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.name + "_label")
            .html(labelAttribute);

        var countyName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);

    };

    
    function moveLabel() {
       
        var x = d3.event.clientX + 10,
            y = d3.event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

    
    function moveLabel() {
        
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;

       
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        
        var y = d3.event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

})(); 