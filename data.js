/* Sample contents.

   An entry is a thread, not a note: it holds dated sittings, and you add to it
   whenever you come back. Dates are day offsets from today so the sample stays
   plausible whenever it's opened.

   This whole file is what storage will eventually replace. */

(function () {
  "use strict";

  function p(daysAgo, text, clips) {
    return { daysAgo: daysAgo, text: text, clips: clips || [] };
  }

  var link = function (name, meta) { return { mark: "LINK", name: name, meta: meta }; };
  var file = function (mark, name, meta) { return { mark: mark, name: name, meta: meta }; };

  window.NOTEBOOK_DATA = {

    notebooks: [
      {
        id: "workshop", name: "Workshop", dye: "oxblood",
        entries: [
          { folio: "F.058", passages: [
            p(2, "Vise collar threads are shot. Spec sheet says 1/2-13; the sleeve option is cheaper but adds slop.",
              [link("mcmaster.com", "/catalog/vise-handles/threaded-collars")]),
            p(1, "Sleeve it. The slop measures 0.004 and the vise is a forty dollar import — not worth a tap and die set I'd use exactly once.")
          ] },
          { folio: "F.055", passages: [
            p(7, "Dust collection, such as it is: shop vac, a cyclone lid off the internet, a five gallon bucket. Catches maybe 80% of the chips and makes 90% of the noise.")
          ] },
          { folio: "F.049", passages: [
            p(12, "The junction box behind the bench is older than the house — copper, cloth insulation, no ground. Pulled a foot of it out to see what I'm dealing with."),
            p(9, "Ran 12-2 from the panel instead of patching it. Four hours, two trips to the store, one blown Saturday. Lights don't dim when the compressor kicks now.")
          ] },
          { folio: "F.041", passages: [
            p(34, "Stanley No. 4 bench plane, fourteen dollars. The iron is pitted but the sole is flat within a few thousandths. Tote cracked clean through the horn."),
            p(21, "Lapped the sole on float glass, 120 through 400. It takes a shaving off pine end grain now, which it absolutely would not do before."),
            p(6, "New tote out of a walnut offcut. The grain runs wrong at the horn so it'll split again in a decade. I'll be fine with that.")
          ] }
        ]
      },
      {
        id: "field-notes", name: "Field notes", dye: "verdigris",
        entries: [
          { folio: "F.060", passages: [
            p(1, "Where the beavers took the alders, the bank is already slumping. Two winters and that corner of the trail is going in the water.")
          ] },
          { folio: "F.057", passages: [
            p(4, "First frost line of the season, maybe an inch into the ground. Late by two weeks against last year.")
          ] },
          { folio: "F.050", passages: [
            p(11, "Barred owl on the powerline at dusk, second time this week. Same pole, same hour.",
              [file("IMG", "owl-treeline.jpg", "1.8 MB")])
          ] },
          { folio: "F.044", passages: [
            p(16, "The creek is running again after five dry weeks. You can hear it from the road, which you couldn't in August."),
            p(3, "Still running, and clear now that the first flush is through. Crayfish under the flat rock by the bend.")
          ] },
          { folio: "F.033", passages: [
            p(26, "Trailhead at 5:40, fog to the treeline. Cold enough that the boardwalk was slick. Two deer at the second switchback, neither of them in any hurry about me.")
          ] }
        ]
      },
      {
        id: "half-built", name: "Half-built", dye: "brass",
        entries: [
          { folio: "F.046", passages: [
            p(18, "Drew the shed four ways. The one with the shed roof and the long eave is the only one that doesn't fight the slope.",
              [file("PDF", "shed-plan-v4.pdf", "840 KB")])
          ] },
          { folio: "F.038", passages: [
            p(40, "On keeping things unfinished: the danger isn't that you never finish, it's that you stop writing things down once you decide they have to be finished."),
            p(20, "Which is an argument for a notebook with no projects in it. Just dated pages that accumulate. Nothing is ever closed, it just stops getting added to.")
          ] },
          { folio: "F.012", passages: [
            p(420, "What I want isn't an organizer. It's somewhere to put a thought down at 11pm without first deciding what kind of thought it is."),
            p(96, "Every app I try wants a title, a tag and a folder before it will take a sentence. That's three decisions I don't have at 11pm."),
            p(12, "Closer to it now: one line, and a notebook only if you happen to know which one. Everything else can wait until later, or never.")
          ] }
        ]
      },
      {
        id: "scraps", name: "Scraps", dye: "lead",
        entries: [
          { folio: "F.061", passages: [ p(0, "Borrow the moisture meter back from Dad.") ] },
          { folio: "F.059", passages: [ p(2, "Dovetail marker — 1:6 for hardwood, 1:8 for soft. I look this up every single time.") ] },
          { folio: "F.056", passages: [ p(5, "Call about the chimney liner before it gets cold enough to matter.") ] },
          { folio: "F.052", passages: [ p(8, "3/8 blade for curves, 1/2 for resawing. Write it on the saw.") ] }
        ]
      },
      {
        id: "kitchen", name: "Kitchen", dye: "bone",
        entries: [
          { folio: "F.054", passages: [
            p(6, "The cast iron finally stopped sticking. Six months of doing nothing special to it, which appears to have been the trick.")
          ] },
          { folio: "F.048", passages: [
            p(13, "Too much thyme in everything lately. It's the only thing that survived the planter, so it goes in the pot.")
          ] },
          { folio: "F.043", passages: [
            p(19, "Sourdough, day nine. Fed at 7:10, doubled by noon — first time it's kept pace without coaxing."),
            p(17, "Smells like beer instead of paint thinner, which I'm told is the point. First loaf Saturday.")
          ] }
        ]
      },
      {
        id: "margins", name: "Margins", dye: "slate",
        entries: [
          { folio: "F.051", passages: [
            p(10, "Lisa, about the plane: \"you're not restoring it, you're just the next person using it.\" Been chewing on that for a week.")
          ] },
          { folio: "F.036", passages: [
            p(45, "Berger — drawing is a way of discovering what you're looking at, not a record of having looked. Same argument for writing things down, probably.")
          ] }
        ]
      }
    ],

    /* never filed anywhere, and none the worse for it */
    floating: [
      { folio: "F.042", passages: [
        p(42, "A list of things I keep meaning to fix: the gate latch, the drip at the hose bib, the third step."),
        p(14, "Gate latch done. It took eleven minutes and I had been walking past it since April.")
      ] },
      { folio: "F.053", passages: [
        p(7, "Why does the garage light buzz only when it's cold?")
      ] },
      { folio: "F.045", passages: [
        p(15, "The word for the smell of rain on dry dust is petrichor. Greek — stone, and the blood of the gods.")
      ] },
      { folio: "F.039", passages: [
        p(31, "Overheard at the counter: \"it's not a shortcut if you've never taken the long way.\"")
      ] }
    ]
  };
})();
