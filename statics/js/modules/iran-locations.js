/* ============================================================
 * Province / City cascading selects (shared by signup,
 * customer profile and admin customers page).
 *
 * Data comes from Django via json_script#iran-locations-data.
 * Usage: window.IranLocations.bind(provinceSelect, citySelect,
 *                                  selectedProvince, selectedCity)
 * ============================================================ */

(function () {

    "use strict";

    var data = {};

    var dataEl = document.getElementById("iran-locations-data");

    if (dataEl) {
        try {
            data = JSON.parse(dataEl.textContent) || {};
        } catch (error) {
            data = {};
        }
    }

    function fill(select, values, placeholder, selected) {

        select.innerHTML = "";

        var first = document.createElement("option");
        first.value = "";
        first.textContent = placeholder;
        select.appendChild(first);

        values.forEach(function (value) {
            var option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        select.value = values.indexOf(selected) !== -1 ? selected : "";
    }

    function bind(provinceSelect, citySelect, selectedProvince, selectedCity) {

        if (!provinceSelect || !citySelect) {
            return null;
        }

        function refreshCities(province, city) {
            var cities = data[province] || [];

            fill(citySelect, cities, "انتخاب شهر", city);
            citySelect.disabled = cities.length === 0;
        }

        fill(provinceSelect, Object.keys(data), "انتخاب استان", selectedProvince);
        refreshCities(provinceSelect.value, selectedCity);

        provinceSelect.addEventListener("change", function () {
            refreshCities(provinceSelect.value, "");
        });

        return {
            set: function (province, city) {
                provinceSelect.value = data[province] ? province : "";
                refreshCities(provinceSelect.value, city);
            },
            reset: function () {
                provinceSelect.value = "";
                refreshCities("", "");
            }
        };
    }

    window.IranLocations = { bind: bind, data: data };

})();
