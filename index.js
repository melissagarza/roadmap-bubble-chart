$(document).ready(function(){

    d3.json("data.json", function(data){
        var chart = $('#roadmap').roadmapBubbleChart({'data': data, 'width': 1500});

    });

});