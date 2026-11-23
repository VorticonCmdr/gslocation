// Small dependency-free autocomplete dropdown for a text input.
//
//   createAutocomplete(input, {
//     source(query, signal),  // returns an array or a Promise of one; `signal`
//                             // is aborted when a newer query replaces this one
//     display(item),          // text shown for an item (and put into the input)
//     onSelect(item),         // called when an item is picked
//     minLength, limit, debounce
//   })
//
// Suggestions are built with DOM nodes (textContent), so text coming from a
// search provider can never be parsed as HTML.
let autocompleteCount = 0;

function createAutocomplete(input, options) {
  const minLength = options.minLength ?? 1;
  const limit = options.limit ?? 10;
  const debounce = options.debounce ?? 0;
  const display = options.display;
  const id = "ac-" + (++autocompleteCount);

  // Wrap the input so the menu can be positioned right below it.
  const wrapper = document.createElement("div");
  wrapper.className = "ac-wrap";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const menu = document.createElement("div");
  menu.className = "ac-menu";
  menu.id = id + "-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  wrapper.appendChild(menu);

  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", menu.id);

  let items = [];
  let activeIndex = -1;
  let timer = null;
  let controller = null;
  let requestId = 0;

  // Bolds the parts of `text` that match a word of the query.
  function highlighted(text, query) {
    const fragment = document.createDocumentFragment();
    const words = query.trim().split(/\s+/).filter(Boolean)
      .map(function (word) { return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    if (words.length === 0) {
      fragment.append(text);
      return fragment;
    }
    // The capture group makes split() keep the matches at odd indexes.
    text.split(new RegExp("(" + words.join("|") + ")", "i")).forEach(function (part, index) {
      if (part === "") {
        return;
      }
      if (index % 2 === 1) {
        const strong = document.createElement("strong");
        strong.textContent = part;
        fragment.append(strong);
      } else {
        fragment.append(part);
      }
    });
    return fragment;
  }

  function setActive(index) {
    activeIndex = index;
    Array.prototype.forEach.call(menu.children, function (el, i) {
      const active = i === index;
      el.classList.toggle("ac-active", active);
      el.setAttribute("aria-selected", active ? "true" : "false");
      if (active) {
        el.scrollIntoView({ block: "nearest" });
      }
    });
    if (index >= 0) {
      input.setAttribute("aria-activedescendant", id + "-item-" + index);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function close() {
    menu.hidden = true;
    menu.replaceChildren();
    items = [];
    setActive(-1);
    input.setAttribute("aria-expanded", "false");
  }

  // Drops any pending or in-flight lookup so a late answer can't reopen the menu.
  function cancel() {
    clearTimeout(timer);
    timer = null;
    requestId++;
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  function select(item) {
    cancel();
    close();
    input.value = display(item);
    options.onSelect(item);
  }

  function render(results, query) {
    items = (results || []).slice(0, limit);
    if (items.length === 0) {
      close();
      return;
    }
    menu.replaceChildren(...items.map(function (item, index) {
      const el = document.createElement("div");
      el.className = "ac-item";
      el.id = id + "-item-" + index;
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", "false");
      el.append(highlighted(String(display(item) ?? ""), query));
      // Keep focus in the input, otherwise blur closes the menu before the click.
      el.addEventListener("mousedown", function (event) { event.preventDefault(); });
      el.addEventListener("click", function () { select(item); });
      return el;
    }));
    setActive(-1);
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function lookup() {
    const query = input.value.trim();
    cancel();
    if (query.length < minLength) {
      close();
      return;
    }
    const current = requestId;
    controller = new AbortController();
    Promise.resolve()
      .then(function () { return options.source(query, controller.signal); })
      .then(function (results) {
        // Ignore answers to a query that has been replaced in the meantime.
        if (current === requestId && document.activeElement === input) {
          render(results, query);
        }
      })
      .catch(function (error) {
        if (current === requestId) {
          close();
        }
        if (!error || error.name !== "AbortError") {
          console.warn("autocomplete lookup failed", error);
        }
      });
  }

  input.addEventListener("input", function () {
    clearTimeout(timer);
    if (debounce > 0 && input.value.trim().length >= minLength) {
      timer = setTimeout(lookup, debounce);
    } else {
      lookup();
    }
  });

  input.addEventListener("keydown", function (event) {
    if (menu.hidden) {
      if (event.key === "ArrowDown" && input.value.trim().length >= minLength) {
        event.preventDefault();
        lookup();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(activeIndex + 1 >= items.length ? 0 : activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        select(items[activeIndex]);
      }
    } else if (event.key === "Escape") {
      // Close only the menu; without this the browser closes the whole popup.
      event.preventDefault();
      cancel();
      close();
    }
  });

  input.addEventListener("blur", function () {
    cancel();
    close();
  });

  return {
    close: function () {
      cancel();
      close();
    }
  };
}
