export type SeedWarmup = {
  name: string;
  day_type: "push" | "pull" | "legs";
  description: string;
  how_to: string;
};

export const SEED_WARMUPS: SeedWarmup[] = [
  // ---- Push warmups ----
  {
    name: "Band Pull-Aparts",
    day_type: "push",
    description: "Light band pulled apart across the chest — primes rear delts and stabilises the shoulder before pressing.",
    how_to: [
      "Hold a light resistance band at shoulder height, arms straight, hands shoulder-width.",
      "Pull the band apart by squeezing your shoulder blades together.",
      "Stop when the band touches your chest; control the return.",
      "2 sets of 15–20 reps."
    ].join("\n")
  },
  {
    name: "Scap Push-Ups",
    day_type: "push",
    description: "Push-up plank with shoulder-blade-only movement — wakes up the serratus.",
    how_to: [
      "Get into a push-up position with arms straight.",
      "Without bending the elbows, let your chest sink slightly between your shoulder blades.",
      "Press the floor away to push your upper back toward the ceiling.",
      "10–12 slow reps."
    ].join("\n")
  },
  {
    name: "Wall Slides",
    day_type: "push",
    description: "Back-against-wall arm slide — opens the thoracic spine and primes overhead pressing.",
    how_to: [
      "Stand with back against a wall, feet ~6 inches out. Low back flat.",
      "Arms up in a 'W' against the wall, elbows and wrists touching it.",
      "Slide arms overhead into a 'Y' while keeping contact with the wall.",
      "Return down. 2 sets of 8–10 reps."
    ].join("\n")
  },
  {
    name: "Shoulder Dislocates (Band)",
    day_type: "push",
    description: "Pass-through with a light band — opens the front of the shoulders and chest.",
    how_to: [
      "Hold a band wide overhead with straight arms.",
      "Slowly pass the band over and behind your head until it touches your low back.",
      "Reverse the motion. Widen grip if it's tight; narrow as you loosen up.",
      "10 slow reps."
    ].join("\n")
  },
  {
    name: "Push-Up to Down-Dog",
    day_type: "push",
    description: "Flow between push-up plank and downward-dog — warms shoulders, chest, and posterior chain.",
    how_to: [
      "Start in a high plank.",
      "Push your hips up and back into a down-dog, pressing chest toward thighs.",
      "Flow forward into plank, then lower into a push-up.",
      "6–8 reps total."
    ].join("\n")
  },
  {
    name: "Empty Bar Press",
    day_type: "push",
    description: "Light overhead press with just the bar — grooves the press pattern under low load.",
    how_to: [
      "Take an empty barbell (or broomstick) in a front-rack position.",
      "Press straight overhead, head through at lockout.",
      "Focus on bar path and bracing — no weight needed.",
      "2 sets of 8 reps."
    ].join("\n")
  },
  {
    name: "Light Face Pulls",
    day_type: "push",
    description: "Very light cable face pull — preps the rear delts and rotator cuff for pressing.",
    how_to: [
      "Cable rope at upper-chest height. Very light load.",
      "Pull the rope toward your forehead, hands flaring out.",
      "Squeeze rear delts; pause briefly.",
      "2 sets of 15 reps."
    ].join("\n")
  },
  {
    name: "Arm Circles",
    day_type: "push",
    description: "Big slow arm circles — increases blood flow through the shoulder girdle.",
    how_to: [
      "Stand tall, arms straight out to the sides.",
      "Make 10 slow forward circles, gradually getting larger.",
      "Reverse: 10 backward circles.",
      "Keep the shoulders relaxed, not shrugged."
    ].join("\n")
  },

  // ---- Pull warmups ----
  {
    name: "Dead Hang",
    day_type: "pull",
    description: "Passive hang from a bar — decompresses the spine and stretches the lats.",
    how_to: [
      "Grab a pull-up bar with an overhand grip.",
      "Let your body hang fully — shoulders relaxed, feet off the floor.",
      "Hang for 20–30 seconds, breathing slowly.",
      "1–2 rounds."
    ].join("\n")
  },
  {
    name: "Scapular Pull-Ups",
    day_type: "pull",
    description: "Pull-up bar hang with shoulder-blade-only movement — activates lats without bending the arms.",
    how_to: [
      "Hang from the bar with arms straight.",
      "Without bending the elbows, pull your shoulder blades down and back.",
      "You'll rise an inch or two. Hold briefly, lower back to a full hang.",
      "2 sets of 8 reps."
    ].join("\n")
  },
  {
    name: "Band Rows",
    day_type: "pull",
    description: "Light banded row — primes the mid-back and biceps for pulling.",
    how_to: [
      "Anchor a band at chest height (or loop around a pole).",
      "Step back to take tension, palms facing each other.",
      "Row the handles to your ribs, squeezing shoulder blades.",
      "2 sets of 15 reps."
    ].join("\n")
  },
  {
    name: "Cat-Cow",
    day_type: "pull",
    description: "Spinal flexion/extension on all fours — wakes up the back and improves posture for rows.",
    how_to: [
      "On hands and knees, wrists under shoulders, knees under hips.",
      "Inhale: drop belly, lift chest and tailbone (cow).",
      "Exhale: round the spine, tuck chin and tail (cat).",
      "8–10 slow cycles."
    ].join("\n")
  },
  {
    name: "Wall Angels",
    day_type: "pull",
    description: "Back-against-wall scapular drill — improves thoracic posture before pulling.",
    how_to: [
      "Stand with back, head, and arms against a wall — arms in a 'W'.",
      "Slide arms up overhead, keeping contact with the wall.",
      "Lower slowly back to the 'W'.",
      "2 sets of 8 reps."
    ].join("\n")
  },
  {
    name: "Light Lat Pulldown",
    day_type: "pull",
    description: "A few light sets of pulldown — preps the lats with the actual pulling pattern.",
    how_to: [
      "Use a very light load on the lat pulldown.",
      "Focus on driving elbows down and squeezing the lats.",
      "Full stretch at the top of each rep.",
      "2 sets of 12 reps."
    ].join("\n")
  },
  {
    name: "Banded Pull-Aparts",
    day_type: "pull",
    description: "Same as for push day — rear delt activation also helps row positioning.",
    how_to: [
      "Hold a light band at shoulder height, arms straight.",
      "Pull apart by squeezing shoulder blades; band touches chest.",
      "Control the return.",
      "2 sets of 15 reps."
    ].join("\n")
  },
  {
    name: "Thread the Needle",
    day_type: "pull",
    description: "Thoracic rotation drill on all fours — opens up the upper back for rows and pulldowns.",
    how_to: [
      "On hands and knees. Reach your right arm under your left, rotating your torso.",
      "Place the right shoulder near the floor; hold 2 seconds.",
      "Return and reach the right arm up to the ceiling, rotating the other way.",
      "6 reps per side."
    ].join("\n")
  },

  // ---- Legs warmups ----
  {
    name: "Bodyweight Squats",
    day_type: "legs",
    description: "Air squats — grooves the squat pattern and warms quads, glutes, and hips.",
    how_to: [
      "Stand feet shoulder-width, toes slightly out.",
      "Squat to depth, knees tracking over toes, chest up.",
      "Drive through the whole foot to stand.",
      "2 sets of 10–15 reps."
    ].join("\n")
  },
  {
    name: "Hip CARs",
    day_type: "legs",
    description: "Controlled articular rotations for the hip — full range of motion drill.",
    how_to: [
      "Stand on one leg (hold a wall if needed).",
      "Lift the other knee up, then circle it out to the side and behind you.",
      "Reverse the direction. Move slowly with full control.",
      "5 reps per direction, each leg."
    ].join("\n")
  },
  {
    name: "Glute Bridges",
    day_type: "legs",
    description: "Floor bridge — fires up the glutes before squats and deadlifts.",
    how_to: [
      "Lie on your back, knees bent, feet flat near your butt.",
      "Drive through your heels to lift your hips up, squeezing glutes.",
      "Pause at the top, lower under control.",
      "2 sets of 12 reps."
    ].join("\n")
  },
  {
    name: "Walking Lunges",
    day_type: "legs",
    description: "Stepping lunges — warms quads, glutes, and stabilisers unilaterally.",
    how_to: [
      "Step forward into a long lunge, back knee just off the floor.",
      "Drive through the front heel to stand and step the back leg through.",
      "Keep torso upright.",
      "10 steps total (5 per leg)."
    ].join("\n")
  },
  {
    name: "Leg Swings",
    day_type: "legs",
    description: "Dynamic hip swings front-to-back and side-to-side.",
    how_to: [
      "Hold a wall for balance. Swing one leg forward and back, relaxed.",
      "10 swings, then switch to side-to-side across the body.",
      "Switch legs and repeat both directions.",
      "10 reps per direction per leg."
    ].join("\n")
  },
  {
    name: "Ankle Rocks",
    day_type: "legs",
    description: "Knee-over-toe ankle mobility — improves squat depth.",
    how_to: [
      "Take a short staggered stance, hands on a wall.",
      "Drive the front knee forward over the toes without lifting the heel.",
      "Rock back and repeat. Feel the stretch in the calf and ankle.",
      "10 reps per side."
    ].join("\n")
  },
  {
    name: "Light Goblet Squat",
    day_type: "legs",
    description: "A few light goblet squats — adds load to the warm-up squat pattern.",
    how_to: [
      "Hold a light dumbbell or kettlebell at chest height.",
      "Squat to depth, elbows tracking inside the knees.",
      "Drive up through the floor.",
      "2 sets of 8 reps with a very light weight."
    ].join("\n")
  },
  {
    name: "World's Greatest Stretch",
    day_type: "legs",
    description: "Lunge + thoracic rotation — full-body mobility primer.",
    how_to: [
      "Step into a deep lunge, both hands on the floor inside the front foot.",
      "Rotate the front-leg-side arm up to the ceiling, opening the chest.",
      "Return the hand, then switch sides.",
      "5 reps per side."
    ].join("\n")
  }
];
