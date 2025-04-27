window.PluginAPI.registerPlugin({
  name: "Word Goal Tracker",
  description: "Shows progress toward a word goal.",
  widget: function() {
    const div = document.createElement('div');
    div.style.padding = "4px 12px";
    div.style.background = "#e6fcf5";
    div.style.borderRadius = "6px";
    let goal = parseInt(localStorage.getItem('word_goal') || "500");
    div.innerHTML = `Goal: <input id="goal-input" type="number" value="${goal}" min="1" style="width:60px;"> <span id="goal-progress"></span>`;
    const quill = window.PluginAPI.getQuill();
    function updateProgress() {
      const text = quill.getText().trim();
      const count = text ? text.split(/\s+/).length : 0;
      div.querySelector('#goal-progress').textContent = `(${count}/${goal})`;
    }
    div.querySelector('#goal-input').onchange = function(e) {
      goal = parseInt(e.target.value);
      localStorage.setItem('word_goal', goal);
      updateProgress();
    };
    quill.on('text-change', updateProgress);
    updateProgress();
    return div;
  }
});