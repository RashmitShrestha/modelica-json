within evalAndArrays;

block Defaulting "The different ways a parameter falls back to a default"

  parameter Real kDef = 0.5 "Has a value, expect 0.5";
  parameter Real kMin(min=0.1) "Only a min, expect 0.1";
  parameter Real kMax(max=10) "Only a max, expect 10";
  parameter Integer nBou(min=1, max=5) "Both bounds, expect 1";
  parameter Real kNone "Nothing, expect the Real data type default";
  parameter Boolean havDef = true "Boolean with a value, expect true";

end Defaulting;
